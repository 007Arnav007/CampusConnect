"""Policy selector (spec 5.4): per-action utility models (P(S|x,a), E[L|S,x,a]) + LinUCB + shielded argmax."""
from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np

from .actions import ACTIONS, BYTES_REF, UDP_BYTES, TCP_BYTES, worst_case_bytes
from .des import W_B, W_D, W_F, W_L
from .shield import ShieldContext, choose

CTX_FEATURES = ["loss_ewma", "burst_len", "rtt_ms", "jitter", "deadline_log", "severity", "receiver_health"]


def context_vector(c: dict, use_incident: bool = True) -> np.ndarray:
    return np.array([c["loss_ewma"], c["burst_len"], c["rtt_ms"], c["jitter"], math.log(c["deadline_ms"]),
                     c["severity"] if use_incident else 0.5, c["receiver_health"]], float)


def expected_bytes(a_id: str, p_ack_first_round: float) -> float:
    """Deterministic-ish cost model: first round always sent; later rounds only if the first failed."""
    a = ACTIONS[a_id]
    first = a.k * UDP_BYTES if a.transport.startswith("UDP") or a.transport == "TCP_UDP" else TCP_BYTES
    if a.parallel_tcp: first += TCP_BYTES
    later = (a.rounds - 1) * (a.k * UDP_BYTES if a.transport.startswith("UDP") else TCP_BYTES) * (1 - p_ack_first_round)
    return first + later + (TCP_BYTES * (1 - p_ack_first_round) if a.hedge else 0)


@dataclass
class UtilityModel:
    actions: list[str]
    use_incident: bool = True
    w_b: float = W_B

    def fit(self, X: np.ndarray, S: dict[str, np.ndarray], L: dict[str, np.ndarray]) -> "UtilityModel":
        import lightgbm as lgb
        self.clf, self.reg = {}, {}
        for a in self.actions:
            self.clf[a] = lgb.LGBMClassifier(n_estimators=120, learning_rate=0.08, num_leaves=15, min_child_samples=30, verbose=-1, n_jobs=2).fit(X, S[a])
            ok = S[a] == 1
            self.reg[a] = lgb.LGBMRegressor(n_estimators=100, learning_rate=0.08, num_leaves=15, min_child_samples=30, verbose=-1, n_jobs=2).fit(X[ok], L[a][ok])
        return self

    def predict(self, x: np.ndarray, severity: float, deadline_ms: float) -> dict[str, float]:
        out = {}
        for a in self.actions:
            P = float(self.clf[a].predict_proba(x[None])[0, 1]); EL = float(self.reg[a].predict(x[None])[0])
            by = expected_bytes(a, P)
            out[a] = (1 + 4 * severity) * P - W_L * min(EL / deadline_ms, 1.0) * P - self.w_b * by / BYTES_REF - W_F * (1 - P) * severity
        return out


class LinUCB:
    """Online contextual bandit for exploration classes. Rewards are applied only when the deadline has expired."""
    def __init__(self, actions: list[str], d: int, alpha: float = 0.8, lam: float = 1.0):
        self.actions, self.alpha = actions, alpha
        self.A = {a: lam * np.eye(d) for a in actions}; self.b = {a: np.zeros(d) for a in actions}

    def scores(self, x: np.ndarray) -> dict[str, float]:
        out = {}
        for a in self.actions:
            Ai = np.linalg.inv(self.A[a]); th = Ai @ self.b[a]
            out[a] = float(th @ x + self.alpha * math.sqrt(max(x @ Ai @ x, 0.0)))
        return out

    def update(self, a: str, x: np.ndarray, reward: float):
        self.A[a] += np.outer(x, x); self.b[a] += reward * x


def eps_soft(utilities: dict[str, float], safe: list[str], eps: float, delta: float, rng: np.random.Generator):
    """Behaviour policy for logging: with prob eps pick uniformly among safe actions within delta of the best.
    Returns (action, propensity) so off-policy evaluation is possible."""
    best = max(utilities[a] for a in safe)
    near = [a for a in safe if utilities[a] >= best - delta]
    greedy = max(safe, key=lambda a: utilities[a])
    probs = {a: 0.0 for a in safe}
    probs[greedy] += 1 - eps
    for a in near: probs[a] += eps / len(near)
    pick = rng.choice(list(probs), p=np.array(list(probs.values())))
    return str(pick), float(probs[pick])


# ---- off-policy evaluation (spec 5.4.6) ----
def ips(r, w, clip=20.0):
    w = np.minimum(w, clip); return float(np.mean(r * w))


def snips(r, w, clip=20.0):
    w = np.minimum(w, clip); return float(np.sum(w * r) / max(np.sum(w), 1e-9))


def doubly_robust(r, w, rhat_logged, rhat_policy, clip=20.0):
    w = np.minimum(w, clip); return float(np.mean(rhat_policy + w * (r - rhat_logged)))
