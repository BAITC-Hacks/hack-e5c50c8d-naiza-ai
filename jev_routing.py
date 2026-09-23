"""H7.5: normalize raw Jev advisory output into deterministic routing evidence.

Jev (`jev_adapter.py`) is advisory-only infrastructure. This module never
invokes Jev itself; it only maps whatever `jev_adapter.get_advisory_decision`
(or a cached `.ralph/runtime/jev/last.json` record) already produced into a
small closed set of normalized signals that `maker_routing.route_maker` can
consume deterministically.

Principles enforced here:

- Jev unavailable, timeout, or malformed output must never raise and must
  never block routing. Anything that is not a clean, validated Jev record
  normalizes to NONE ("no advisory evidence"), and routing proceeds using
  its normal deterministic policy.
- Jev's raw decision vocabulary (continue/retry/reverify/checker/escalate/
  human_required) is intentionally not forwarded verbatim into routing; it is
  mapped onto NormalizedJevSignal so routing never depends on Jev's exact
  wire format.
- This module does not decide LOCAL/SPLIT/CODEX/HUMAN. That authority stays
  in maker_routing.route_maker.
"""

from enum import Enum


class NormalizedJevSignal(Enum):
    NONE = "NONE"
    CONTINUE = "CONTINUE"
    RETRY = "RETRY"
    REVERIFY = "REVERIFY"
    CHECKER = "CHECKER"
    ESCALATE = "ESCALATE"
    HUMAN_REQUIRED = "HUMAN_REQUIRED"


# Maps jev_adapter.VALID_DECISIONS -> NormalizedJevSignal.
_RAW_DECISION_TO_SIGNAL = {
    "continue": NormalizedJevSignal.CONTINUE,
    "retry": NormalizedJevSignal.RETRY,
    "reverify": NormalizedJevSignal.REVERIFY,
    "checker": NormalizedJevSignal.CHECKER,
    "escalate": NormalizedJevSignal.ESCALATE,
    "human_required": NormalizedJevSignal.HUMAN_REQUIRED,
}


def normalize_jev_signal(jev_result):
    """Normalize a `jev_adapter.get_advisory_decision(...)`-shaped result.

    Accepts the raw dict produced by `jev_adapter` (or a cached
    `.ralph/runtime/jev/last.json` load of the same shape), and returns a
    `NormalizedJevSignal`. Never raises: any missing/unavailable/malformed
    input safely normalizes to `NormalizedJevSignal.NONE`, which routing
    treats as "no advisory evidence" rather than a single point of failure.
    """
    if not isinstance(jev_result, dict):
        return NormalizedJevSignal.NONE

    # jev_adapter marks a failed call (network error, timeout, parse error,
    # schema-invalid decision) with success is False. Treat any of that as
    # "no advisory evidence" rather than propagating an error signal.
    if jev_result.get("success") is not True:
        return NormalizedJevSignal.NONE

    decision = jev_result.get("decision")
    if not isinstance(decision, str):
        return NormalizedJevSignal.NONE

    return _RAW_DECISION_TO_SIGNAL.get(decision.lower(), NormalizedJevSignal.NONE)


def coerce_fresh_jev_signal(jev_result, *, work_item, repair_attempt):
    """Coerce a Jev record into a signal, but only if it is fresh evidence
    for the exact `work_item`/`repair_attempt` currently being routed.

    `jev_adapter.get_advisory_decision(..., tags=...)` tags every record it
    writes with the work_item/repair_attempt/stage it was fetched for. A
    record tagged for a different work item, or a different (older) repair
    attempt of the same work item, is stale advisory evidence: using it
    would mean routing this decision on a signal computed for a different
    situation. Stale evidence normalizes to NONE, exactly like a malformed
    or unavailable response - it never blocks routing, it just carries no
    advisory weight.
    """
    if not isinstance(jev_result, dict):
        return NormalizedJevSignal.NONE

    if jev_result.get("work_item") != work_item:
        return NormalizedJevSignal.NONE
    if jev_result.get("repair_attempt") != repair_attempt:
        return NormalizedJevSignal.NONE

    return normalize_jev_signal(jev_result)


def coerce_jev_signal(value):
    """Coerce a routing-input-supplied jev signal into `NormalizedJevSignal`.

    Accepts a `NormalizedJevSignal`, its string `.value`, `None`, or a raw
    Jev result dict (delegates to `normalize_jev_signal`). Anything else
    normalizes to NONE rather than raising, so a malformed advisory input
    never becomes a routing failure.
    """
    if value is None:
        return NormalizedJevSignal.NONE
    if isinstance(value, NormalizedJevSignal):
        return value
    if isinstance(value, str):
        try:
            return NormalizedJevSignal(value)
        except ValueError:
            return NormalizedJevSignal.NONE

    # Migration compatibility: accept the historical
    # laya_routing.NormalizedLayaSignal (or another Enum-like object)
    # when its .value belongs to the stable advisory vocabulary.
    enum_value = getattr(value, "value", None)
    if isinstance(enum_value, str):
        try:
            return NormalizedJevSignal(enum_value)
        except ValueError:
            return NormalizedJevSignal.NONE

    if isinstance(value, dict):
        return normalize_jev_signal(value)

    return NormalizedJevSignal.NONE
