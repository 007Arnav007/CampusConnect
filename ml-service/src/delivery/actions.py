"""Action set as-1 (spec 5.4.3), message classes (5.4.2) and the static fallback table (5.4.8)."""
from __future__ import annotations

from dataclasses import dataclass

ACTION_SET_VERSION = "as-1"
MAX_DATAGRAMS = 8
UDP_BYTES = 700          # signed notice datagram (<= 1200 B cap)
TCP_BYTES = 760          # framed event incl. headers
BYTES_REF = UDP_BYTES


@dataclass(frozen=True)
class Action:
    id: str
    name: str
    transport: str        # HTTP | WS | TCP | UDP | UDP_TCP | TCP_UDP
    k: int                # copies per round
    spacing_ms: int
    rounds: int
    hedge: bool = False
    parallel_tcp: bool = False
    fresh_conn: bool = False


ACTIONS: dict[str, Action] = {a.id: a for a in [
    Action("A0", "HTTPS_ONCE", "HTTP", 1, 0, 1),
    Action("A1", "WS_PUSH_PERSIST", "WS", 1, 0, 1),
    Action("A2", "TCP_ACK_R1", "TCP", 1, 0, 1),
    Action("A3", "TCP_ACK_R2", "TCP", 1, 0, 2),
    Action("A4", "TCP_ACK_R3_NEWCONN", "TCP", 1, 0, 3, fresh_conn=True),
    Action("A5", "UDP_K1", "UDP", 1, 0, 2),
    Action("A6", "UDP_K2_S0", "UDP", 2, 0, 2),
    Action("A7", "UDP_K2_S30", "UDP", 2, 30, 2),
    Action("A8", "UDP_K3_S30", "UDP", 3, 30, 2),
    Action("A9", "UDP_K3_S80", "UDP", 3, 80, 2),
    Action("A10", "UDP_K4_S30", "UDP", 4, 30, 2),
    Action("A11", "UDP_K4_S80", "UDP", 4, 80, 2),
    Action("A12", "UDP_K2_S30_HEDGE_TCP", "UDP_TCP", 2, 30, 1, hedge=True),
    Action("A13", "UDP_K3_S30_HEDGE_TCP", "UDP_TCP", 3, 30, 1, hedge=True),
    Action("A14", "TCP_PLUS_UDP_PARALLEL", "TCP_UDP", 2, 30, 1, parallel_tcp=True),
]}

CLASSES = ("NORMAL", "LIVE", "RELIABLE", "HIGH", "CRITICAL_NOTICE")
ALLOWED: dict[str, tuple[str, ...]] = {
    "NORMAL": ("A0",), "LIVE": ("A1", "A0"),
    "RELIABLE": ("A2", "A3", "A4"),
    "HIGH": ("A2", "A3", "A4", "A5", "A6", "A7", "A12"),
    "CRITICAL_NOTICE": tuple(f"A{i}" for i in range(7, 15)),
}
ACK_REQUIRED = {"NORMAL": False, "LIVE": False, "RELIABLE": True, "HIGH": True, "CRITICAL_NOTICE": True}
BYTE_BUDGET = {"NORMAL": 4_000, "LIVE": 4_000, "RELIABLE": 12_000, "HIGH": 12_000, "CRITICAL_NOTICE": 16_000}


def datagrams(a: Action) -> int:
    return a.k * a.rounds + (1 if (a.hedge or a.parallel_tcp) else 0)


def worst_case_bytes(a: Action) -> int:
    udp = a.k * a.rounds * UDP_BYTES if a.transport.startswith("UDP") or a.transport == "TCP_UDP" else 0
    tcp = (a.rounds * TCP_BYTES) if a.transport == "TCP" else (TCP_BYTES if (a.hedge or a.parallel_tcp) else 0)
    return udp + tcp


def static_table(msg_class: str, loss: float, burst_len: float) -> str:
    """Deterministic fallback (spec 5.4.8). Bands: loss < 2 % | 2-10 % | > 10 % or burst >= 6."""
    band = 2 if (loss > 0.10 or burst_len >= 6) else (1 if loss >= 0.02 else 0)
    table = {"RELIABLE": ("A2", "A3", "A4"), "HIGH": ("A2", "A3", "A12"), "CRITICAL_NOTICE": ("A7", "A9", "A13")}
    if msg_class not in table:
        return "A1" if msg_class == "LIVE" else "A0"
    return table[msg_class][band]
