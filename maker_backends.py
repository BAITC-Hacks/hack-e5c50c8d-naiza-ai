"""Maker backend registry for OpenRalph logical Maker selection."""

from dataclasses import dataclass


@dataclass(frozen=True)
class MakerBackend:
    id: str
    kind: str
    agent: str
    provider_id: str
    model_id: str
    enabled: bool = True


class UnknownMakerBackendError(ValueError):
    """Raised when a Maker backend id is not registered."""


DEFAULT_MAKER_BACKEND_ID = "maker_local_qwen"

# The real Codex Maker backend: the locally installed `codex` CLI
# (codex_cli.py), invoked directly as a subprocess via non-interactive
# `codex exec` - not an OpenCode subagent. It is a distinct backend id
# from `maker_local_qwen`, never a silent fallback onto some other model.
#
# `model_id` is intentionally "auto": no Codex model is ever hardcoded
# here. The Codex CLI's own currently available/default subscription
# model is used (codex_cli.build_exec_argv omits --model unless CODEX_MODEL
# is explicitly set), since the installed CLI has no known deterministic
# supported-model discovery command.
#
# `enabled=True` here only means "this backend is operationally configured
# and resolvable" - it does NOT mean routing may select it by default.
# Selection additionally requires `provider_health.codex_escalation_allowed()`
# (env `OPENRALPH_CODEX_ESCALATION_ALLOWED=1`), which stays False by
# default, and `maker_routing.route_maker` never chooses CODEX unless the
# caller explicitly passes `codex_allowed=True`. That policy gate is what
# lets an operator allow/disallow Codex escalation without touching this
# registry, and keeps escalation opt-in in every environment (including
# tests) that does not set the env var.
CODEX_MAKER_BACKEND_ID = "maker_codex_escalation"

MAKER_BACKENDS = {
    "maker_local_qwen": MakerBackend(
        id="maker_local_qwen",
        kind="local",
        agent="maker",
        provider_id="openai",
        model_id="gpt-5.6-sol",
    ),
    CODEX_MAKER_BACKEND_ID: MakerBackend(
        id=CODEX_MAKER_BACKEND_ID,
        kind="codex_cli",
        agent="codex_cli",
        provider_id="codex_cli",
        model_id="auto",
        enabled=True,
    ),
}


def resolve_maker_backend(backend_id: str | None = None) -> MakerBackend:
    """Resolve a Maker backend by stable OpenRalph backend id."""
    selected_id = backend_id or DEFAULT_MAKER_BACKEND_ID
    try:
        return MAKER_BACKENDS[selected_id]
    except KeyError as exc:
        raise UnknownMakerBackendError("Unknown Maker backend: " + selected_id) from exc


def default_maker_backend() -> MakerBackend:
    """Return the default Maker backend."""
    return resolve_maker_backend(DEFAULT_MAKER_BACKEND_ID)


def codex_maker_backend() -> MakerBackend:
    """Return the (disabled-by-default) Codex escalation backend descriptor."""
    return resolve_maker_backend(CODEX_MAKER_BACKEND_ID)
