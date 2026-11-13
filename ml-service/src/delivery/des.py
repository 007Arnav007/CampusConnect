"""Discrete-event model of one notice delivery (spec 7.6, 10.6).

Channel: two-state Gilbert-Elliott loss in 10 ms slots + lognormal jitter. Packet fates use *common random numbers*:
packet index -> fixed uniforms per scenario, so every action is evaluated against the same channel realisation
(full-information, counterfactual logs). TCP is modelled with Linux-like RTO (min 200 ms, doubling) on the same channel.
"""
from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np

from .actions import ACTIONS, BYTES_REF, TCP_BYTES, UDP_BYTES, Action

SLOT_MS = 10.0
LOSS_GOOD, LOSS_BAD = 0.003, 0.90


@dataclass(frozen=True)
class ChannelParams:
    base_rtt_ms: float = 40.0
    jitter_sigma: float = 0.25          # lognormal sigma of one-way delay multiplier
    mean_loss: float = 0.05
    mean_bad_ms: float = 120.0          # mean burst duration (bad-state sojourn)
    proc_ms: float = 5.0                # receiver processing before the ACK
    stall_ms: float = 0.0               # extra receiver stall (e.g. 400 ms)

    def burst_len_pkts(self, interval_ms: float = 20.0) -> float:
        return max(1.0, self.mean_bad_ms / interval_ms)


class Channel:
    def __init__(self, p: ChannelParams, seed: int, horizon_ms: float = 12_000.0):
        self.p = p
        rng = np.random.default_rng(seed)
        n = int(horizon_ms / SLOT_MS) + 2
        pi_bad = min(max((p.mean_loss - LOSS_GOOD) / (LOSS_BAD - LOSS_GOOD), 0.0), 0.95)
        p_bg = min(SLOT_MS / max(p.mean_bad_ms, SLOT_MS), 1.0)
        p_gb = p_bg * pi_bad / max(1 - pi_bad, 1e-9)
        u = rng.random(n); state = np.zeros(n, dtype=np.int8)
        state[0] = 1 if rng.random() < pi_bad else 0
        for i in range(1, n):
            state[i] = (0 if u[i] < p_bg else 1) if state[i - 1] else (1 if u[i] < p_gb else 0)
        self.state = state
        self.u_fwd = rng.random(256); self.u_bwd = rng.random(256)
        self.z_fwd = rng.standard_normal(256); self.z_bwd = rng.standard_normal(256)
        self.u_tcp = rng.random(64); self.z_tcp = rng.standard_normal(64)

    def _lost(self, t_ms: float, u: float) -> bool:
        s = self.state[min(int(t_ms / SLOT_MS), len(self.state) - 1)]
        return u < (LOSS_BAD if s else LOSS_GOOD)

    def _delay(self, z: float) -> float:
        half = self.p.base_rtt_ms / 2
        return half * math.exp(self.p.jitter_sigma * z - self.p.jitter_sigma ** 2 / 2)

    def udp_roundtrip(self, idx: int, send_ms: float) -> float | None:
        """ACK arrival time of one datagram (None if forward or ACK path loses it)."""
        i = idx % 256
        if self._lost(send_ms, self.u_fwd[i]): return None
        rx = send_ms + self._delay(self.z_fwd[i])
        ack_send = rx + self.p.proc_ms + self.p.stall_ms
        j = (idx * 7 + 3) % 256
        if self._lost(ack_send, self.u_bwd[j]): return None
        return ack_send + self._delay(self.z_bwd[j])

    def tcp_roundtrip(self, idx: int, send_ms: float, new_conn: bool = False) -> tuple[float | None, int]:
        """App-level ACK arrival for a TCP-carried message, with kernel-style retransmissions. Returns (arrival, attempts)."""
        rto = max(200.0, 1.3 * self.p.base_rtt_ms); t = send_ms; attempts = 0
        if new_conn: t += self.p.base_rtt_ms      # handshake
        for j in range(6):
            attempts += 1
            k = (idx * 5 + j) % 64
            if not self._lost(t, self.u_tcp[k]):
                rx = t + self._delay(self.z_tcp[k])
                ack = rx + self.p.proc_ms + self.p.stall_ms
                k2 = (idx * 11 + j + 1) % 64
                if self._lost(ack, self.u_tcp[k2]) and j < 5:
                    t += rto; rto *= 2; continue          # ack lost -> sender retransmits on RTO
                return ack + self._delay(self.z_tcp[k2]), attempts
            t += rto; rto *= 2
        return None, attempts


@dataclass
class Outcome:
    success: bool
    latency_ms: float            # first valid ACK latency (inf if none)
    bytes_sent: int
    datagrams: int
    spurious_rounds: int
    duplicates: int              # copies that reached the receiver after the first (idempotent, but cost)
    first_ack_round: int


def simulate(a: Action, ch: Channel, deadline_ms: float, timeout_ms: float, t0: float = 100.0) -> Outcome:
    """Run action `a` against channel realisation `ch`. t0 offsets the message into the channel timeline."""
    t_max = min(0.5 * deadline_ms, 5000.0)
    tmo = min(max(timeout_ms, 40.0), t_max)
    sent_b = 0; n_dg = 0; acks: list[tuple[float, int]] = []     # (ack_arrival, round)
    delivered_rx = 0; idx = 0; spurious = 0
    round_start = t0; hedge_done = False
    if a.transport == "HTTP" or a.transport == "WS":
        end = ch.tcp_roundtrip(0, t0)[0]
        ok = end is not None and end - t0 <= deadline_ms
        return Outcome(ok, (end - t0) if end else math.inf, TCP_BYTES, 1, 0, 0, 0)
    for r in range(a.rounds):
        if round_start - t0 >= deadline_ms: break
        round_end = round_start + tmo
        if a.rounds == 1 and (a.hedge or a.parallel_tcp): round_end = t0 + deadline_ms
        earliest = min((x[0] for x in acks), default=math.inf)
        if a.transport in ("UDP", "UDP_TCP", "TCP_UDP"):
            for i in range(a.k):
                s = round_start + i * a.spacing_ms
                if s >= earliest or s - t0 >= deadline_ms: break          # cancel-on-ACK
                arr = ch.udp_roundtrip(r * 16 + i, s); idx += 1; n_dg += 1; sent_b += UDP_BYTES
                if arr is not None:
                    acks.append((arr, r)); earliest = min(earliest, arr)
            if a.parallel_tcp and r == 0:
                arr, att = ch.tcp_roundtrip(900 + r, round_start); sent_b += TCP_BYTES * att; n_dg += att
                if arr is not None: acks.append((arr, r)); earliest = min(earliest, arr)
        else:   # TCP actions
            arr, att = ch.tcp_roundtrip(r, round_start, new_conn=(a.fresh_conn and r >= 1))
            sent_b += TCP_BYTES * att; n_dg += att
            if arr is not None: acks.append((arr, r))
        if a.hedge and not hedge_done and r == 0:
            th = t0 + 0.4 * deadline_ms
            if min((x[0] for x in acks), default=math.inf) > th:          # no ACK by 0.4 D -> also send over TCP
                arr, att = ch.tcp_roundtrip(950, th); sent_b += TCP_BYTES * att; n_dg += att; hedge_done = True
                if arr is not None: acks.append((arr, r))
        earliest = min((x[0] for x in acks), default=math.inf)
        if earliest <= round_end: break
        # round timed out: next round starts; flag spurious if an earlier packet's ACK is still going to arrive
        if r + 1 < a.rounds and earliest < math.inf and earliest - t0 < deadline_ms: spurious += 1
        round_start = round_end; tmo = min(2 * tmo, t_max)
    first = min((x[0] for x in acks), default=math.inf)
    lat = first - t0
    ok = lat <= deadline_ms
    dup = max(len(acks) - 1, 0)
    fr = min((x for x in acks), default=(0, 0))[1] if acks else 0
    return Outcome(ok, lat if ok else (lat if math.isfinite(lat) else math.inf), sent_b, n_dg, spurious, dup, fr)


# ---- utility (spec 5.4.5) ----
W_L, W_B, W_D, W_F = 0.2, 0.05, 0.1, 0.5


def utility(o: Outcome, severity: float, deadline_ms: float, w_b: float = W_B) -> float:
    S = 1.0 if o.success else 0.0
    lat = min(o.latency_ms / deadline_ms, 1.0) if o.success else 1.0
    return (1 + 4 * severity) * S - W_L * lat * S - w_b * (o.bytes_sent / BYTES_REF) - W_D * o.duplicates - W_F * (1 - S) * severity
