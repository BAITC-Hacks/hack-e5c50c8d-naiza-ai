"""H7.5: normalize raw Laya advisory output into deterministic routing evidence.

Laya (`laya_adapter.py`) is advisory-only infrastructure. This module never
invokes Laya itself; it only maps whatever `laya_adapter.get_advisory_decision`
(or a cached `.ralph/runtime/laya/last.json` record) already produced into a
small closed set of normalized signals that `maker_routing.route_maker` can
consume deterministically.

Principles enforced here:

- Laya unavailable, timeout, or malformed output must never raise and must
  never block routing. Anything that is not a clean, validated Laya record
  normalizes to NONE ("no advisory evidence"), and routing proceeds using
  its normal deterministic policy.
- Laya's raw decision vocabulary (continue/retry/reverify/checker/escalate/
  human_required) is intentionally not forwarded verbatim into routing; it is
  mapped onto NormalizedLayaSignal so routing never depends on Laya's exact
  wire format.
- This module does not decide LOCAL/SPLIT/CODEX/HUMAN. That authority stays
  in maker_routing.route_maker.
"""

from enum import Enum


class NormalizedLayaSignal(Enum):
    NONE = "NONE"
    CONTINUE = "CONTINUE"
    RETRY = "RETRY"
    REVERIFY = "REVERIFY"
    CHECKER = "CHECKER"
    ESCALATE = "ESCALATE"
    HUMAN_REQUIRED = "HUMAN_REQUIRED"


# Maps laya_adapter.VALID_DECISIONS -> NormalizedLayaSignal.
_RAW_DECISION_TO_SIGNAL = {
    "continue": NormalizedLayaSignal.CONTINUE,
    "retry": NormalizedLayaSignal.RETRY,
    "reverify": NormalizedLayaSignal.REVERIFY,
    "checker": NormalizedLayaSignal.CHECKER,
    "escalate": NormalizedLayaSignal.ESCALATE,
    "human_required": NormalizedLayaSignal.HUMAN_REQUIRED,
}


def normalize_laya_signal(laya_result):
    """Normalize a `laya_adapter.get_advisory_decision(...)`-shaped result.

    Accepts the raw dict produced by `laya_adapter` (or a cached
    `.ralph/runtime/laya/last.json` load of the same shape), and returns a
    `NormalizedLayaSignal`. Never raises: any missing/unavailable/malformed
    input safely normalizes to `NormalizedLayaSignal.NONE`, which routing
    treats as "no advisory evidence" rather than a single point of failure.
    """
    if not isinstance(laya_result, dict):
        return NormalizedLayaSignal.NONE

    # laya_adapter marks a failed call (network error, timeout, parse error,
    # schema-invalid decision) with success is False. Treat any of that as
    # "no advisory evidence" rather than propagating an error signal.
    if laya_result.get("success") is not True:
        return NormalizedLayaSignal.NONE

    decision = laya_result.get("decision")
    if not isinstance(decision, str):
        return NormalizedLayaSignal.NONE

    return _RAW_DECISION_TO_SIGNAL.get(decision.lower(), NormalizedLayaSignal.NONE)


def coerce_fresh_laya_signal(laya_result, *, work_item, repair_attempt):
    """Coerce a Laya record into a signal, but only if it is fresh evidence
    for the exact `work_item`/`repair_attempt` currently being routed.

    `laya_adapter.get_advisory_decision(..., tags=...)` tags every record it
    writes with the work_item/repair_attempt/stage it was fetched for. A
    record tagged for a different work item, or a different (older) repair
    attempt of the same work item, is stale advisory evidence: using it
    would mean routing this decision on a signal computed for a different
    situation. Stale evidence normalizes to NONE, exactly like a malformed
    or unavailable response - it never blocks routing, it just carries no
    advisory weight.
    """
    if not isinstance(laya_result, dict):
        return NormalizedLayaSignal.NONE

    if laya_result.get("work_item") != work_item:
        return NormalizedLayaSignal.NONE
    if laya_result.get("repair_attempt") != repair_attempt:
        return NormalizedLayaSignal.NONE

    return normalize_laya_signal(laya_result)


def coerce_laya_signal(value):
    """Coerce a routing-input-supplied laya signal into `NormalizedLayaSignal`.

    Accepts a `NormalizedLayaSignal`, its string `.value`, `None`, or a raw
    Laya result dict (delegates to `normalize_laya_signal`). Anything else
    normalizes to NONE rather than raising, so a malformed advisory input
    never becomes a routing failure.
    """
    if value is None:
        return NormalizedLayaSignal.NONE
    if isinstance(value, NormalizedLayaSignal):
        return value
    if isinstance(value, str):
        try:
            return NormalizedLayaSignal(value)
        except ValueError:
            return NormalizedLayaSignal.NONE
    if isinstance(value, dict):
        return normalize_laya_signal(value)
    return NormalizedLayaSignal.NONE
