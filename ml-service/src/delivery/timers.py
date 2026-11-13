"""ACK timeout estimators (spec 5.3): RFC 6298, fixed, empirical quantile and Q-RTO (quantile GBDT + CQR margin)."""
from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np

KINDS = ("stationary", "rtt_step", "jitter_spike", "ge_burst", "stall", "drift")
FEATURES = ["ewma_rtt", "rttvar", "min_rtt", "last8_mean", "last8_max", "last8_std", "loss_ewma", "loss_run", "since_ack", "inc_sev"]


@dataclass
class Stream:
    kind: str
    lat: np.ndarray        # ACK latency of each message's first transmission (ms), valid where ~lost
    lost: np.ndarray       # bool
    inc_sev: np.ndarray    # incident-severity feature from M1 (noisy, lagged)


def make_stream(kind: str, seed: int, n: int = 600, randomize: bool = False) -> Stream:
    rng = np.random.default_rng(seed)
    base = rng.uniform(15, 120) if randomize else 50.0
    sigma = rng.uniform(0.1, 0.4) if randomize else 0.2
    proc = 5.0
    p_loss = rng.uniform(0.03, 0.10) if randomize else 0.05
    rtt = np.full(n, base); sig = np.full(n, sigma); procv = np.full(n, proc); sev = np.zeros(n)
    onset = int(rng.integers(150, 350)); dur = int(rng.integers(60, 160))
    if kind == "rtt_step":
        rtt[onset:] += rng.uniform(100, 200) if randomize else 150; sev[onset + 10:] = 0.8
    elif kind == "jitter_spike":
        sig[onset:onset + dur] *= 5; sev[onset + 10:onset + dur + 10] = 0.7
    elif kind == "stall":
        procv[onset:onset + 25] += 400; sev[onset + 5:onset + 40] = 0.6
    elif kind == "drift":
        rtt *= 1 + 0.5 * np.sin(np.arange(n) / n * 2 * np.pi * 1.5)
    # message-level burst loss (2-state Markov); heavier in ge_burst
    pb = p_loss if kind != "ge_burst" else rng.uniform(0.10, 0.18)
    burst = 6.0 if kind == "ge_burst" else 1.5
    p_bg = 1 / burst; p_gb = p_bg * (pb / 0.9) / (1 - pb / 0.9)
    state = 0; lost = np.zeros(n, bool)
    for i in range(n):
        state = (rng.random() >= p_bg) if state else (rng.random() < p_gb)
        lost[i] = rng.random() < (0.9 if state else 0.003)
        if kind == "ge_burst" and state: sev[i] = max(sev[i], 0.5 if rng.random() < 0.7 else 0)
    lat = rtt * np.exp(sig * rng.standard_normal(n) - sig ** 2 / 2) + procv
    sev = np.clip(sev + rng.normal(0, 0.05, n), 0, 1)
    if kind in ("stationary", "drift"):
        sev[rng.random(n) < 0.02] = 0.5          # rare false alarm from the localizer
    return Stream(kind, lat, lost, sev)


def features(s: Stream) -> np.ndarray:
    """Causal features at message i use only messages < i."""
    n = len(s.lat); X = np.zeros((n, len(FEATURES)))
    ew = s.lat[0]; var = s.lat[0] / 2; le = 0.05; run = 0; since = 0; hist: list[float] = []
    for i in range(n):
        h8 = hist[-8:] or [ew]
        X[i] = [ew, var, min(hist[-50:] or [ew]), np.mean(h8), max(h8), np.std(h8), le, run, since, s.inc_sev[i]]
        if s.lost[i]:
            le += (1 / 16) * (1 - le); run += 1; since += 1
        else:
            var += 0.25 * (abs(s.lat[i] - ew) - var); ew += 0.125 * (s.lat[i] - ew)
            le += (1 / 16) * (0 - le); run = 0; since = 0; hist.append(float(s.lat[i]))
    return X


def rfc6298_series(s: Stream):
    """SRTT/RTTVAR after each message (independent of K / min-RTO knobs). Returns arrays aligned to *prior* state."""
    n = len(s.lat); srtt = np.zeros(n); rv = np.zeros(n); cur_s = None; cur_v = 0.0
    for i in range(n):
        srtt[i] = cur_s if cur_s is not None else s.lat[0]; rv[i] = cur_v if cur_s is not None else s.lat[0] / 2
        if not s.lost[i]:
            r = s.lat[i]
            if cur_s is None: cur_s, cur_v = r, r / 2
            else: cur_v = 0.75 * cur_v + 0.25 * abs(cur_s - r); cur_s = 0.875 * cur_s + 0.125 * r
    return srtt, rv


def rfc6298_timeout(srtt, rv, k=4.0, min_rto=200.0, g=1.0):
    return np.clip(srtt + np.maximum(g, k * rv), min_rto, 5000.0)


def empirical_timeout(s: Stream, mult=1.2, q=0.95, window=100):
    n = len(s.lat); out = np.full(n, 500.0); hist: list[float] = []
    for i in range(n):
        if len(hist) >= 10: out[i] = np.quantile(hist[-window:], q) * mult
        if not s.lost[i]: hist.append(float(s.lat[i]))
    return np.clip(out, 40, 5000)


class QRTO:
    """One LightGBM quantile model per tau; optional conformalised-quantile-regression margin from calibration streams."""
    def __init__(self, taus=(0.8, 0.9, 0.95, 0.98, 0.99, 0.995), use_incident=True, n_estimators=150):
        self.taus, self.use_incident, self.n = taus, use_incident, n_estimators
        self.models, self.margin = {}, {}
        self.cols = [i for i, f in enumerate(FEATURES) if self.use_incident or f != "inc_sev"]

    def fit(self, streams: list[Stream], calib: list[Stream]):
        import lightgbm as lgb
        X = np.vstack([features(s)[~s.lost] for s in streams])[:, self.cols]; y = np.concatenate([s.lat[~s.lost] for s in streams])
        Xc = np.vstack([features(s)[~s.lost] for s in calib])[:, self.cols]; yc = np.concatenate([s.lat[~s.lost] for s in calib])
        for t in self.taus:
            m = lgb.LGBMRegressor(objective="quantile", alpha=t, n_estimators=self.n, learning_rate=0.08, num_leaves=15,
                                  min_child_samples=40, subsample=0.8, subsample_freq=1, verbose=-1, n_jobs=2).fit(X, y)
            self.models[t] = m
            res = yc - m.predict(Xc)
            k = math.ceil((len(res) + 1) * t)
            self.margin[t] = float(np.sort(res)[min(k, len(res)) - 1])
        return self

    def timeout(self, s: Stream, tau: float, cqr: bool = True) -> np.ndarray:
        q = self.models[tau].predict(features(s)[:, self.cols])
        return np.clip(q + (self.margin[tau] if cqr else 0.0), 40, 5000)


def score(s: Stream, timeout: np.ndarray) -> tuple[float, float]:
    """(spurious rate among delivered messages, mean timeout at lost messages = recovery detection delay)."""
    spur = float(np.mean(s.lat[~s.lost] > timeout[~s.lost]))
    rec = float(np.mean(timeout[s.lost])) if s.lost.any() else float("nan")
    return spur, rec
