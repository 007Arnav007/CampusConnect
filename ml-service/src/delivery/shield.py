"""Deterministic Shield (spec 5.4.8): a pure function. ML may only *rank* actions that this function lets through.

Every rule is a small predicate so it can be property-tested and mirrored 1:1 in the gateway (TypeScript).
Golden vectors produced by `experiments/make_shield_vectors.py` are asserted in both languages.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from .actions import (ACK_REQUIRED, ACTIONS, ALLOWED, BYTE_BUDGET, MAX_DATAGRAMS, datagrams, static_table, worst_case_bytes)


@dataclass(frozen=True)
class ShieldContext:
    msg_class: str
    deadline_ms: float
    signed: bool = True
    test_mode: bool = True
    exp_minus_iat_ms: float = 30_000
    payload_bytes: int = 400
    datagram_bytes: int = 700
    gateway_load: float = 0.2
    snapshot_valid: bool = True
    authorised: bool = True                 # backend-signed dispatch request (R6)
    tcp_probe_ok: bool = True               # R11
    receiver_bucket_ok: bool = True         # R5
    incident_bucket_ok: bool = True
    ood: bool = False                       # R9: a feature lies > 10 % outside the training range
    breaker_open: bool = False              # R10: learned policy underperforms the static shadow
    timeout_ms: float = 500                 # proposed per-round timeout (R7)


RULES = ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8", "R9", "R10", "R11", "R12"]


def violated(a_id: str, x: ShieldContext) -> list[str]:
    a = ACTIONS[a_id]; v: list[str] = []
    if a_id not in ALLOWED[x.msg_class]: v.append("R1")
    if x.msg_class == "CRITICAL_NOTICE" and not (ACK_REQUIRED[x.msg_class] and x.signed and x.exp_minus_iat_ms <= 60_000 and x.test_mode):
        v.append("R2")
    if datagrams(a) > MAX_DATAGRAMS or worst_case_bytes(a) > BYTE_BUDGET[x.msg_class]: v.append("R3")
    if x.payload_bytes > 900 or x.datagram_bytes > 1200: v.append("R4")
    if not (x.receiver_bucket_ok and x.incident_bucket_ok) or (x.gateway_load > 0.85 and x.msg_class in ("NORMAL", "LIVE")): v.append("R5")
    if not x.authorised: v.append("R6")
    rounds_ms = x.timeout_ms * a.rounds + (a.k - 1) * a.spacing_ms
    if x.timeout_ms > 5000 or (rounds_ms > x.deadline_ms and a.rounds > 1 and x.timeout_ms > x.deadline_ms): v.append("R7")
    if not x.snapshot_valid: v.append("R8")
    if x.ood: v.append("R9")
    if x.breaker_open: v.append("R10")
    if (a.hedge or a.parallel_tcp or a.transport == "TCP") and not x.tcp_probe_ok: v.append("R11")
    return v


# Gates that force the static table for the *whole decision* (the learned policy is not trusted at all)
GLOBAL_GATES = {"R6", "R8", "R9", "R10"}


def safe_set(x: ShieldContext) -> list[str]:
    return [a for a in ACTIONS if not violated(a, x)]


@dataclass
class Decision:
    action: str
    source: str                         # "learned" | "static-table" | "refused"
    safe: list[str] = field(default_factory=list)
    reason: str = ""


def choose(x: ShieldContext, utilities: dict[str, float] | None, loss: float = 0.0, burst: float = 1.0) -> Decision:
    """argmax of predicted utility over A_safe; static table when anything global trips or A_safe is empty.
    `utilities` may contain arbitrary (even adversarial / NaN / inf) numbers: they can only reorder safe actions."""
    safe = safe_set(x)
    gates = {r for a in ACTIONS for r in violated(a, x)} & GLOBAL_GATES
    fallback = static_table(x.msg_class, loss, burst)
    if gates:
        return _static(fallback, x, safe, f"gate {sorted(gates)}")
    if not utilities or not safe:
        return _static(fallback, x, safe, "no utilities" if not utilities else "A_safe empty")
    ranked = [(u, a) for a, u in ((a, utilities.get(a, float("-inf"))) for a in safe) if u == u]   # drop NaN
    if not ranked:
        return _static(fallback, x, safe, "all utilities invalid")
    best = max(ranked, key=lambda t: (t[0], -int(t[1][1:])))[1]
    return Decision(best, "learned", safe, "")


REFUSE = "REFUSE"


def _static(fallback: str, x: ShieldContext, safe: list[str], reason: str) -> Decision:
    a = _final(fallback, x)
    return Decision(a, "refused" if a == "REFUSE" else "static-table", safe, reason)


def _final(action: str, x: ShieldContext) -> str:
    """The static table itself must also be shielded. If the table's pick is unsafe use the first safe allowed action;
    if nothing is allowed the shield REFUSES (the message is persisted as an unconfirmed fallback, never sent unsafely)."""
    if not violated(action, x): return action
    for a in ALLOWED[x.msg_class]:
        if not violated(a, x): return a
    return REFUSE
