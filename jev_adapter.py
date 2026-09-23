#!/usr/bin/env python3
"""Jev System One advisory decision adapter for OpenRalph.

Advisory only: never mutates lifecycle state.

Persists results to:
    .ralph/runtime/jev/last.json

API:
    POST https://jev-ai.pro/api/v1/systemone

Model:
    jev-latest
"""

import json
import os
import time
from pathlib import Path

try:
    import requests as _requests_lib
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False


ROOT = Path(__file__).resolve().parent
RALPH_DIR = ROOT / ".ralph"

JEV_DIR = RALPH_DIR / "runtime" / "jev"
JEV_LAST_PATH = JEV_DIR / "last.json"

DEFAULT_JEV_ENDPOINT = os.environ.get(
    "JEV_ENDPOINT",
    "https://jev-ai.pro/api/v1",
)

DEFAULT_JEV_MODEL = os.environ.get(
    "JEV_MODEL",
    "jev-latest",
)

DEFAULT_JEV_TIMEOUT = 15

VALID_DECISIONS = {
    "continue",
    "retry",
    "reverify",
    "checker",
    "escalate",
    "human_required",
}


# Keep the same bounded context contract used by the old Laya adapter.
_CONTEXT_KEYS = (
    "source",
    "message",
    "verification_status",
    "checker_status",
    "work_item",
    "repair_attempt",
    "stage",
    "context_classification",
    "projected_peak_tokens",
    "maker_backend",
    "checker_blocker_count",
    "checker_major_count",
    "checker_minor_count",
    "repair_history",
)


def _ensure_jev_dir():
    """Create .ralph/runtime/jev if missing."""
    JEV_DIR.mkdir(parents=True, exist_ok=True)


def _configured_endpoint():
    return os.environ.get(
        "JEV_ENDPOINT",
        DEFAULT_JEV_ENDPOINT,
    )


def _configured_model():
    return os.environ.get(
        "JEV_MODEL",
        DEFAULT_JEV_MODEL,
    )


def _configured_timeout():
    return int(
        os.environ.get(
            "JEV_TIMEOUT",
            str(DEFAULT_JEV_TIMEOUT),
        )
    )


def _configured_api_key():
    return os.environ.get(
        "JEV_AI_API_KEY",
        "",
    ).strip()


def _validate_endpoint(endpoint):
    """Return True for a usable HTTP(S) endpoint."""
    if not endpoint:
        return False

    stripped = endpoint.strip()

    if not stripped:
        return False

    return (
        stripped.startswith("http://")
        or stripped.startswith("https://")
    )


def _systemone_url(base_url):
    return base_url.rstrip("/") + "/systemone"


def _models_url(base_url):
    return base_url.rstrip("/") + "/models"


def _build_state(failure_context=None):
    """Build the bounded structured state sent to Jev.

    Unknown keys are deliberately excluded so the advisory request does not
    accidentally grow with unrelated state.
    """

    if not failure_context:
        return {
            "source": "openralph",
            "message": "no_context",
        }

    state = {}

    for key in _CONTEXT_KEYS:
        value = failure_context.get(key)

        if value is not None:
            state[key] = value

    if not state:
        state = {
            "source": "openralph",
            "message": "no_recognized_context",
        }

    return state


def _questions():
    """Return the stable Jev advisory questions."""

    return {
        "next_action": {
            "type": "choice",
            "instructions": (
                "Choose the safest next OpenRalph lifecycle action from the "
                "predefined alternatives using only the supplied execution "
                "evidence. This is advisory evidence only. Deterministic "
                "OpenRalph hard rules remain authoritative."
            ),
            "criteria": {
                "continue": (
                    "Continue the current lifecycle normally. Use when there "
                    "is no evidence requiring retry, verification, escalation, "
                    "Checker intervention, or human intervention."
                ),
                "retry": (
                    "Retry the Maker repair because the current problem "
                    "appears repairable by another implementation attempt."
                ),
                "reverify": (
                    "Run deterministic verification again because verification "
                    "evidence is missing, stale, inconsistent, or should be "
                    "confirmed before progressing."
                ),
                "checker": (
                    "Proceed to Checker because implementation and deterministic "
                    "verification evidence are sufficient for review."
                ),
                "escalate": (
                    "Recommend escalation to a stronger backend because of "
                    "execution pressure, repeated failure, or serious findings. "
                    "This recommendation cannot bypass OpenRalph hard gates."
                ),
                "human_required": (
                    "Require human review because safe automated continuation "
                    "cannot be determined from the available evidence."
                ),
            },
        },

        "high_risk": {
            "type": "noul",
            "instructions": (
                "Is the current OpenRalph execution situation high risk, such "
                "that escalation or human review should be considered? "
                "Answer based only on the supplied evidence."
            ),
        },
    }


def _request_payload(model, failure_context=None):
    return {
        "model": model,
        "state": _build_state(failure_context),
        "questions": _questions(),
    }


def _parse_response(response_data):
    """Convert Jev System One response into the historical advisory shape."""

    if not isinstance(response_data, dict):
        raise ValueError("response is not a JSON object")

    answers = response_data.get("answers")

    if not isinstance(answers, dict):
        raise ValueError("missing or invalid 'answers' object")

    next_action = answers.get("next_action")

    if not isinstance(next_action, dict):
        raise ValueError("missing 'next_action' answer")

    if next_action.get("type") != "choice":
        raise ValueError(
            "next_action answer is not type 'choice'"
        )

    decision = next_action.get("choice")

    confidence = next_action.get("confidence")

    probabilities = next_action.get(
        "probabilities"
    )

    high_risk = answers.get("high_risk", {})

    risk = None

    if isinstance(high_risk, dict):
        risk = high_risk.get("noul")

    return {
        "decision": decision,
        "confidence": confidence,
        "risk": risk,
        "probabilities": probabilities,
        "model": response_data.get("model"),
        "usage": response_data.get("usage"),
        "raw": response_data,
    }


def _validate_parsed(parsed):
    """Validate the normalized Jev advisory response."""

    decision = parsed.get("decision")

    if not isinstance(decision, str):
        return False, "decision is not a string"

    if decision not in VALID_DECISIONS:
        return (
            False,
            f"decision {decision!r} not in {VALID_DECISIONS}",
        )

    confidence = parsed.get("confidence")

    if confidence is not None:
        if (
            not isinstance(confidence, (int, float))
            or isinstance(confidence, bool)
        ):
            return False, "confidence is not a number"

        if confidence < 0 or confidence > 1:
            return (
                False,
                f"confidence {confidence} out of [0,1]",
            )

    risk = parsed.get("risk")

    if risk is not None:
        if (
            not isinstance(risk, (int, float))
            or isinstance(risk, bool)
        ):
            return False, "risk is not a number"

        if risk < 0 or risk > 1:
            return (
                False,
                f"risk {risk} out of [0,1]",
            )

    probabilities = parsed.get("probabilities")

    if probabilities is not None:
        if not isinstance(probabilities, dict):
            return (
                False,
                "probabilities is not a dict",
            )

        for key, value in probabilities.items():
            if key not in VALID_DECISIONS:
                return (
                    False,
                    f"probability key {key!r} "
                    f"not in {VALID_DECISIONS}",
                )

            if (
                not isinstance(value, (int, float))
                or isinstance(value, bool)
            ):
                return (
                    False,
                    f"probability {key!r} is not numeric",
                )

            if value < 0 or value > 1:
                return (
                    False,
                    f"probability {key!r} "
                    f"out of [0,1]",
                )

    return True, ""


def _send_request(failure_context=None):
    """Send one System One request to Jev.

    Returns:
        (True, parsed_response) on a valid HTTP/JSON response.
        (False, error_dict) on transport/configuration/parse failure.
    """

    if not HAS_REQUESTS:
        return False, {
            "error": "no_requests_lib",
            "detail": "requests library not available",
        }

    api_key = _configured_api_key()

    if not api_key:
        return False, {
            "error": "api_key_not_configured",
            "detail": (
                "JEV_AI_API_KEY environment "
                "variable is not configured"
            ),
        }

    endpoint = _configured_endpoint()

    if not _validate_endpoint(endpoint):
        return False, {
            "error": "malformed_endpoint",
            "detail": (
                f"malformed JEV_ENDPOINT: "
                f"{endpoint!r}"
            ),
        }

    try:
        timeout = _configured_timeout()
    except (TypeError, ValueError):
        return False, {
            "error": "malformed_timeout",
            "detail": (
                "malformed JEV_TIMEOUT: "
                f"{os.environ.get('JEV_TIMEOUT', '')!r}"
            ),
        }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = _request_payload(
        _configured_model(),
        failure_context,
    )

    try:
        response = _requests_lib.post(
            _systemone_url(endpoint),
            json=payload,
            headers=headers,
            timeout=timeout,
        )

        response.raise_for_status()

    except _requests_lib.exceptions.Timeout:
        return False, {
            "error": "timeout",
            "detail": (
                f"request timed out after {timeout}s"
            ),
        }

    except _requests_lib.exceptions.HTTPError as exc:
        status = getattr(
            exc.response,
            "status_code",
            "unknown",
        )

        reason = getattr(
            exc.response,
            "reason",
            "",
        )

        return False, {
            "error": "http_error",
            "detail": f"HTTP {status}: {reason}",
        }

    except _requests_lib.exceptions.ConnectionError as exc:
        return False, {
            "error": "connection_error",
            "detail": str(exc),
        }

    except Exception as exc:
        return False, {
            "error": "request_error",
            "detail": str(exc),
        }

    try:
        response_data = response.json()
        parsed = _parse_response(response_data)

        return True, parsed

    except (ValueError, TypeError, KeyError) as exc:
        return False, {
            "error": "parse_error",
            "detail": str(exc),
        }


def get_advisory_decision(
    failure_context=None,
    *,
    tags=None,
):
    """Get a fresh advisory decision from Jev.

    Preserves the historical OpenRalph advisory contract:

        success
        decision
        confidence
        risk
        probabilities
        parsed
        error
        work_item
        repair_attempt
        stage
        timestamp

    Jev remains advisory only and never mutates lifecycle state.
    """

    _ensure_jev_dir()

    start_time = time.time()

    success, result = _send_request(
        failure_context
    )

    elapsed = round(
        time.time() - start_time,
        3,
    )

    if not success:
        record = {
            "success": False,
            "error": result.get(
                "error",
                "unknown",
            ),
            "detail": result.get(
                "detail",
                "",
            ),
            "elapsed_seconds": elapsed,
            "parsed": False,
        }

        return _finalize_record(
            record,
            tags,
        )

    is_valid, error_msg = _validate_parsed(
        result
    )

    record = {
        "success": is_valid,
        "decision": result.get("decision"),
        "confidence": result.get(
            "confidence"
        ),
        "risk": result.get("risk"),
        "probabilities": result.get(
            "probabilities"
        ),
        "model": result.get("model"),
        "usage": result.get("usage"),
        "elapsed_seconds": elapsed,
        "parsed": True,
    }

    if not is_valid:
        record["error"] = error_msg

        raw = result.get("raw")

        if raw is not None:
            record["raw"] = raw

    return _finalize_record(
        record,
        tags,
    )


def _finalize_record(record, tags):
    """Merge routing identity + timestamp and persist evidence."""

    _ensure_jev_dir()

    record["timestamp"] = time.time()

    if tags:
        record["work_item"] = tags.get(
            "work_item"
        )
        record["repair_attempt"] = tags.get(
            "repair_attempt"
        )
        record["stage"] = tags.get(
            "stage"
        )

    JEV_LAST_PATH.write_text(
        json.dumps(
            record,
            indent=2,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )

    return record


def check_jev_endpoint():
    """Check Jev API reachability and configured model.

    Returns:
        {
            endpoint_configured,
            api_key_configured,
            reachable,
            model_published,
            error
        }

    Jev remains optional advisory infrastructure.
    """

    endpoint = _configured_endpoint()
    api_key = _configured_api_key()

    result = {
        "endpoint_configured": bool(endpoint),
        "api_key_configured": bool(api_key),
        "reachable": False,
        "model_published": False,
    }

    if not result["endpoint_configured"]:
        result["error"] = (
            "JEV_ENDPOINT not configured"
        )
        return result

    if not _validate_endpoint(endpoint):
        result["error"] = (
            f"malformed JEV_ENDPOINT: "
            f"{endpoint!r}"
        )
        return result

    if not api_key:
        result["error"] = (
            "JEV_AI_API_KEY not configured"
        )
        return result

    if not HAS_REQUESTS:
        result["error"] = (
            "requests library not available"
        )
        return result

    try:
        timeout = _configured_timeout()
    except (TypeError, ValueError):
        result["error"] = (
            "malformed JEV_TIMEOUT: "
            f"{os.environ.get('JEV_TIMEOUT', '')!r}"
        )
        return result

    try:
        response = _requests_lib.get(
            _models_url(endpoint),
            headers={
                "Authorization": (
                    f"Bearer {api_key}"
                ),
            },
            timeout=timeout,
        )

        response.raise_for_status()

        data = response.json()

        result["reachable"] = True

        model_names = set()

        if isinstance(data, dict):
            candidates = (
                data.get("models")
                or data.get("data")
                or []
            )

            if isinstance(candidates, list):
                for item in candidates:
                    if isinstance(item, str):
                        model_names.add(item)

                    elif isinstance(item, dict):
                        name = (
                            item.get("name")
                            or item.get("id")
                        )

                        if name:
                            model_names.add(name)

                        aliases = item.get(
                            "aliases",
                            [],
                        )

                        if isinstance(
                            aliases,
                            list,
                        ):
                            for alias in aliases:
                                if isinstance(
                                    alias,
                                    str,
                                ):
                                    model_names.add(
                                        alias
                                    )

        result["model_published"] = (
            _configured_model()
            in model_names
        )

    except _requests_lib.exceptions.Timeout:
        result["error"] = "endpoint timeout"

    except _requests_lib.exceptions.HTTPError as exc:
        status = getattr(
            exc.response,
            "status_code",
            "unknown",
        )

        result["error"] = (
            f"HTTP {status} "
            "from models endpoint"
        )

    except _requests_lib.exceptions.ConnectionError as exc:
        result["error"] = (
            f"endpoint unreachable: {exc}"
        )

    except Exception as exc:
        result["error"] = (
            f"models check failed: {exc}"
        )

    return result
