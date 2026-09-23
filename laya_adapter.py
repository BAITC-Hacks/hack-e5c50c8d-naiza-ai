#!/usr/bin/env python3
"""Laya advisory decision adapter for OpenRalph H6 hardening.

Advisory only: never mutates lifecycle state. Persists results to
.rai/ph/runtime/laya/last.json as evidence/context for the orchestrator.

Endpoint: POST /v1/chat/completions
Model: laya-typed-decisions
URL: https://zhiger.tail293e59.ts.net/v1
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
LAYA_DIR = RALPH_DIR / "runtime" / "laya"
LAYA_LAST_PATH = LAYA_DIR / "last.json"

DEFAULT_LAYA_ENDPOINT = os.environ.get(
    "LAYA_ENDPOINT",
    "https://zhiger.tail293e59.ts.net/v1",
)
REQUIRED_LAYA_MODEL = "laya-typed-decisions"
DEFAULT_LAYA_MODEL = os.environ.get("LAYA_MODEL", REQUIRED_LAYA_MODEL)
DEFAULT_LAYA_TIMEOUT = 15

VALID_DECISIONS = {"continue", "retry", "reverify", "checker", "escalate", "human_required"}


def _ensure_laya_dir():
    """Create .ralph/runtime/laya if missing."""
    LAYA_DIR.mkdir(parents=True, exist_ok=True)


def _configured_endpoint():
    return os.environ.get("LAYA_ENDPOINT", DEFAULT_LAYA_ENDPOINT)


def _configured_model():
    return os.environ.get("LAYA_MODEL", DEFAULT_LAYA_MODEL)


def _configured_timeout():
    return int(os.environ.get("LAYA_TIMEOUT", str(DEFAULT_LAYA_TIMEOUT)))


def _validate_endpoint(endpoint):
    """Validate that an endpoint string is well-formed.

    Returns True if the endpoint is a non-empty string starting with
    'http://' or 'https://'. Returns False otherwise.
    """
    if not endpoint:
        return False
    stripped = endpoint.strip()
    if not stripped:
        return False
    return stripped.startswith("http://") or stripped.startswith("https://")


def _chat_completions_url(base_url):
    return base_url.rstrip("/") + "/chat/completions"


def _models_url(base_url):
    return base_url.rstrip("/") + "/models"


def _request_payload(model, prompt):
    return {
        "model": model,
        "messages": [
            {"role": "user", "content": prompt},
        ],
    }


_PROMPT_CONTEXT_KEYS = (
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


def _build_prompt(failure_context=None):
    """Build a concise prompt for the Laya decision service.

    Parameters:
        failure_context: dict describing the current work item/lifecycle
            context. Recognized keys (all optional) are listed in
            `_PROMPT_CONTEXT_KEYS`: routing evidence such as work_item,
            repair_attempt, lifecycle stage, context classification,
            projected token usage, the current Maker backend, latest
            verify/checker status, BLOCKER/MAJOR/MINOR finding counts, and a
            compact repair/failure history summary. If None, sends a
            minimal probe.

    Returns a string prompt suitable for the chat completions API.
    """
    if failure_context:
        context_parts = []
        for k in _PROMPT_CONTEXT_KEYS:
            v = failure_context.get(k)
            if v is not None:
                context_parts.append(f"{k}: {v}")
        context_str = "; ".join(context_parts) if context_parts else "unknown"
    else:
        context_str = "no_context"

    return (
        f"OpenRalph H6 advisory decision request.\n"
        f"Context: {context_str}\n\n"
        "Return your response in this exact format:\n"
        "decision: <one of continue|retry|reverify|checker|escalate|human_required>\n"
        "confidence: <float between 0 and 1>\n"
        "risk: <float>\n"
        "probabilities: {'continue': <float>, 'retry': <float>, 'reverify': <float>, 'checker': <float>, 'escalate': <float>, 'human_required': <float>}\n"
    )


def _parse_response(raw_text):
    """Deterministically parse Laya response text.

    Expected format:
        decision: <decision>
        confidence: <float>
        risk: <float>
        probabilities: {'continue': ..., 'retry': ..., 'reverify': ..., 'checker': ..., 'escalate': ..., 'human_required': ...}

    Returns a dict with keys {decision, confidence, risk, probabilities, raw}.
    Raises ValueError on parse failure.
    """
    result = {"raw": raw_text}

    lines = raw_text.strip().splitlines()
    decision_line = None
    conf_line = None
    risk_line = None
    probs_line = None

    for line in lines:
        stripped = line.strip()
        if stripped.startswith("decision:"):
            decision_line = stripped[len("decision:"):].strip().lower()
        elif stripped.startswith("confidence:"):
            conf_line = stripped[len("confidence:"):].strip()
        elif stripped.startswith("risk:"):
            risk_line = stripped[len("risk:"):].strip()
        elif stripped.startswith("probabilities:"):
            probs_line = stripped[len("probabilities:"):].strip()

    if decision_line is None:
        raise ValueError("missing 'decision:' line")

    result["decision"] = decision_line

    # Parse confidence
    if conf_line is not None:
        try:
            result["confidence"] = float(conf_line)
        except (ValueError, TypeError):
            raise ValueError(f"invalid confidence value: {conf_line!r}")
    else:
        result["confidence"] = None

    # Parse risk
    if risk_line is not None:
        try:
            result["risk"] = float(risk_line)
        except (ValueError, TypeError):
            raise ValueError(f"invalid risk value: {risk_line!r}")
    else:
        result["risk"] = None

    # Parse probabilities
    if probs_line is not None:
        try:
            import ast as _ast
            raw_probs = _ast.literal_eval(probs_line)
            if isinstance(raw_probs, dict):
                parsed = {}
                for k, v in raw_probs.items():
                    if isinstance(v, (int, float)) and not isinstance(v, bool):
                        parsed[str(k)] = float(v)
                result["probabilities"] = parsed
            else:
                raise ValueError("probabilities is not a dict")
        except (ValueError, TypeError, SyntaxError, AttributeError):
            raise ValueError(f"invalid probabilities value: {probs_line!r}")
    else:
        result["probabilities"] = None

    return result


def _validate_parsed(parsed):
    """Validate parsed Laya response against schema constraints.

    Checks:
        - decision is in VALID_DECISIONS
        - confidence is a float between 0 and 1 (if present)
        - risk is a float (if present)
        - probabilities keys are subset of VALID_DECISIONS (if present)

    Returns (is_valid, error_message).
    """
    decision = parsed.get("decision")
    if not isinstance(decision, str):
        return False, "decision is not a string"
    if decision not in VALID_DECISIONS:
        return False, f"decision {decision!r} not in {VALID_DECISIONS}"

    confidence = parsed.get("confidence")
    if confidence is not None:
        if not isinstance(confidence, (int, float)) or isinstance(confidence, bool):
            return False, "confidence is not a number"
        if confidence < 0 or confidence > 1:
            return False, f"confidence {confidence} out of [0,1]"

    risk = parsed.get("risk")
    if risk is not None:
        if not isinstance(risk, (int, float)) or isinstance(risk, bool):
            return False, "risk is not a number"

    probs = parsed.get("probabilities")
    if probs is not None:
        if not isinstance(probs, dict):
            return False, "probabilities is not a dict"
        for k in probs:
            if k not in VALID_DECISIONS:
                return False, f"probability key {k!r} not in {VALID_DECISIONS}"

    return True, ""


def _send_request(prompt):
    """Send a request to the Laya endpoint.

    Returns (success, result_dict).
    On success: (True, parsed_response)
    On failure: (False, error_dict with 'error' key)
    """
    if not HAS_REQUESTS:
        return False, {"error": "no_requests_lib", "detail": "requests library not available"}

    headers = {
        "Content-Type": "application/json",
    }

    endpoint = _configured_endpoint()
    model = _configured_model()
    try:
        timeout = _configured_timeout()
    except (TypeError, ValueError):
        return False, {"error": "malformed LAYA_TIMEOUT", "detail": os.environ.get("LAYA_TIMEOUT", "")}

    try:
        resp = _requests_lib.post(
            _chat_completions_url(endpoint),
            json=_request_payload(model, prompt),
            headers=headers,
            timeout=timeout,
        )
        resp.raise_for_status()
        raw = resp.text
    except _requests_lib.exceptions.Timeout:
        return False, {"error": "timeout", "detail": f"request timed out after {timeout}s"}
    except _requests_lib.exceptions.HTTPError as exc:
        return False, {"error": "http_error", "detail": f"HTTP {exc.response.status_code}: {exc.response.reason}"}
    except _requests_lib.exceptions.ConnectionError as exc:
        return False, {"error": "connection_error", "detail": str(exc)}
    except Exception as exc:
        return False, {"error": "request_error", "detail": str(exc)}

    try:
        response_data = json.loads(raw)
        choices = response_data.get("choices", [])
        if not choices:
            return False, {"error": "no_choices", "detail": "empty choices in response"}
        assistant_msg = choices[0].get("message", {})
        raw_text = assistant_msg.get("content", "")
        if not raw_text or not isinstance(raw_text, str):
            return False, {"error": "empty_content", "detail": "no assistant content"}
        return True, {"raw_content": raw_text}
    except (json.JSONDecodeError, KeyError, IndexError, TypeError) as exc:
        return False, {"error": "parse_error", "detail": str(exc)}


def get_advisory_decision(failure_context=None, *, tags=None):
    """Get an advisory decision from Laya.

    This function:
        - Sends a concise prompt to the Laya endpoint
        - Parses and validates the response
        - Persists the result to .ralph/runtime/laya/last.json
        - NEVER mutates lifecycle state

    Parameters:
        failure_context: optional dict describing the current context/failure
            (see `_PROMPT_CONTEXT_KEYS`).
        tags: optional dict of routing-identity fields (e.g. work_item,
            repair_attempt, stage) merged into the persisted record so a
            caller can later tell whether a cached record actually belongs
            to the current work item/repair attempt, or is stale. Never
            sent to the Laya endpoint itself - advisory only, local
            bookkeeping.

    Returns a dict with keys:
        {success, decision, confidence, risk, probabilities, parsed, error}

    On success (valid response):
        {success: True, decision: str, confidence: float or None,
         risk: float or None, probabilities: dict or None, parsed: bool}

    On failure (network, timeout, malformed, invalid decision):
        {success: False, error: str, detail: str, parsed: False}

    In both cases the record also carries `tags` (if given) and a
    `timestamp` (epoch seconds) so evidence can be audited/traced later.
    """
    _ensure_laya_dir()
    prompt = _build_prompt(failure_context)

    start_time = time.time()
    success, result = _send_request(prompt)
    elapsed = round(time.time() - start_time, 3)

    if not success:
        record = {
            "success": False,
            "error": result.get("error", "unknown"),
            "detail": result.get("detail", ""),
            "elapsed_seconds": elapsed,
            "parsed": False,
        }
        return _finalize_record(record, tags)

    # Parse the raw content
    raw_content = result.get("raw_content", "")
    try:
        parsed = _parse_response(raw_content)
    except ValueError as exc:
        record = {
            "success": False,
            "error": "parse_error",
            "detail": str(exc),
            "elapsed_seconds": elapsed,
            "parsed": False,
        }
        return _finalize_record(record, tags)

    # Validate the parsed response
    is_valid, error_msg = _validate_parsed(parsed)

    record = {
        "success": is_valid,
        "decision": parsed.get("decision"),
        "confidence": parsed.get("confidence"),
        "risk": parsed.get("risk"),
        "probabilities": parsed.get("probabilities"),
        "elapsed_seconds": elapsed,
        "parsed": True,
    }

    if not is_valid:
        record["error"] = error_msg
        record["raw"] = raw_content[:500]  # truncate for storage

    return _finalize_record(record, tags)


def _finalize_record(record, tags):
    """Merge identity tags + timestamp into a Laya record and persist it."""
    record["timestamp"] = time.time()
    if tags:
        record["work_item"] = tags.get("work_item")
        record["repair_attempt"] = tags.get("repair_attempt")
        record["stage"] = tags.get("stage")
    LAYA_LAST_PATH.write_text(json.dumps(record, indent=2) + "\n")
    return record


def check_laya_endpoint():
    """Check if the Laya endpoint is reachable and the model is published.

    Returns a dict with keys: {endpoint_configured, reachable, model_published, error}.

    Config validation:
        - Not configured → error only (advisory-only, caller decides severity)
        - Malformed endpoint → config error (FAIL in Doctor)
        - Valid but unreachable → connectivity error (WARN in Doctor)
        - Reachable but model missing → model not published (WARN in Doctor)
        - Reachable + model present → PASS
    """
    endpoint = _configured_endpoint()
    result = {"endpoint_configured": bool(endpoint), "reachable": False, "model_published": False}

    if not result["endpoint_configured"]:
        result["error"] = "LAYA_ENDPOINT not configured"
        return result

    if not _validate_endpoint(endpoint):
        result["error"] = f"malformed LAYA_ENDPOINT: {endpoint!r}"
        return result

    if not HAS_REQUESTS:
        result["error"] = "requests library not available"
        return result

    models_url = _models_url(endpoint)
    try:
        timeout = _configured_timeout()
    except (TypeError, ValueError):
        result["error"] = f"malformed LAYA_TIMEOUT: {os.environ.get('LAYA_TIMEOUT', '')!r}"
        return result
    try:
        resp = _requests_lib.get(models_url, timeout=timeout)
        resp.raise_for_status()
        raw = resp.text
        data = json.loads(raw)
        result["reachable"] = True

        if isinstance(data, dict):
            ids = []
            for item in data.get("data", []):
                item_id = item.get("id")
                if item_id:
                    ids.append(item_id)
                for alias in item.get("aliases", []):
                    if alias not in ids:
                        ids.append(alias)
            result["model_published"] = REQUIRED_LAYA_MODEL in ids
        else:
            result["model_published"] = False

    except _requests_lib.exceptions.Timeout:
        result["error"] = "endpoint timeout"
    except _requests_lib.exceptions.HTTPError as exc:
        result["error"] = f"HTTP {exc.response.status_code} from models endpoint"
    except _requests_lib.exceptions.ConnectionError as exc:
        result["error"] = f"endpoint unreachable: {exc}"
    except Exception as exc:
        result["error"] = f"models check failed: {exc}"

    return result
