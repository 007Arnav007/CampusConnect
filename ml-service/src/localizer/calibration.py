"""Temperature scaling, split-conformal sets (LAC, optional Mondrian) and zone-impact notification scoping."""
from __future__ import annotations

import math
from dataclasses import dataclass, field

import numpy as np
from scipy.optimize import minimize_scalar

NONE = "NONE"


def to_vector(post) -> tuple[list[str], np.ndarray]:
    """Marginal distribution over {nodes..., NONE}, renormalised."""
    v = np.append(post.p_node, post.p_none)
    return post.nodes + [NONE], v / v.sum()


def temper(p: np.ndarray, T: float) -> np.ndarray:
    q = np.power(np.clip(p, 1e-12, 1), 1.0 / T)
    return q / q.sum()


def fit_temperature(vectors: list[np.ndarray], truth_idx: list[int]) -> float:
    def nll(logT):
        T = math.exp(logT)
        return -float(np.mean([np.log(temper(v, T)[y] + 1e-12) for v, y in zip(vectors, truth_idx)]))
    r = minimize_scalar(nll, bounds=(math.log(0.2), math.log(8.0)), method="bounded")
    return math.exp(r.x)


@dataclass
class TwoStageCalibrator:
    """Stage 1 (detection): Platt scaling of logit P(fault). Stage 2 (localisation): temperature on P(node | fault).
    One temperature over the joint 97-way vector flattens NONE against 96 fault entries and destroys detection."""
    a: float = 1.0
    b: float = 0.0
    T: float = 1.0

    def fit(self, vectors: list[np.ndarray], truth_idx: list[int]) -> "TwoStageCalibrator":
        from sklearn.linear_model import LogisticRegression
        none_i = len(vectors[0]) - 1
        lo = np.array([_logit(1 - v[none_i]) for v in vectors]).reshape(-1, 1)
        y = np.array([0 if t == none_i else 1 for t in truth_idx])
        lr = LogisticRegression(C=100.0).fit(lo, y); self.a, self.b = float(lr.coef_[0, 0]), float(lr.intercept_[0])
        cond = [(v[:-1] / v[:-1].sum(), t) for v, t in zip(vectors, truth_idx) if t != none_i]
        self.T = fit_temperature([c[0] for c in cond], [c[1] for c in cond])
        return self

    def apply(self, v: np.ndarray) -> np.ndarray:
        p_fault = 1 / (1 + math.exp(-(self.a * _logit(1 - v[-1]) + self.b)))
        cond = temper(v[:-1] / v[:-1].sum(), self.T)
        return np.append(p_fault * cond, 1 - p_fault)


def _logit(p: float) -> float:
    p = min(max(p, 1e-9), 1 - 1e-9); return math.log(p / (1 - p))


@dataclass
class Conformal:
    alpha: float = 0.10
    qhat: float = 1.0
    qhat_by_type: dict[str, float] = field(default_factory=dict)
    T: float = 1.0
    cal: object | None = None          # any object with .apply(v); defaults to temperature T

    def _p(self, v):
        return self.cal.apply(v) if self.cal is not None else temper(v, self.T)

    def fit(self, vectors, truth_idx, truth_type=None, alpha=None):
        self.alpha = alpha or self.alpha
        scores = np.array([1 - self._p(v)[y] for v, y in zip(vectors, truth_idx)])
        self.qhat = self._q(scores)
        if truth_type:
            for ty in set(truth_type):
                s = np.array([sc for sc, t in zip(scores, truth_type) if t == ty])
                if len(s) >= 20: self.qhat_by_type[ty] = self._q(s)
        return self

    def _q(self, scores: np.ndarray) -> float:
        n = len(scores); k = math.ceil((n + 1) * (1 - self.alpha))
        return 1.0 if k > n else float(np.sort(scores)[k - 1])

    def predict_set(self, names: list[str], v: np.ndarray, node_types: dict[str, str] | None = None, mondrian=False) -> list[str]:
        p = self._p(v)
        out = []
        for i, n in enumerate(names):
            q = self.qhat_by_type.get(node_types.get(n, ""), self.qhat) if (mondrian and node_types) else self.qhat
            if 1 - p[i] <= q: out.append(n)
        return out or [names[int(np.argmax(p))]]


def entropy(p: np.ndarray) -> float:
    q = p[p > 0]; return float(-(q * np.log(q)).sum())


def needs_review(conf_set: list[str], p_none_cal: float, p: np.ndarray, s_max: int = 3, h_max: float = 2.0) -> bool:
    return len(conf_set) > s_max or 0.3 <= p_none_cal <= 0.7 or entropy(p) > h_max


def zone_scope(zone_marginal: np.ndarray, severity: float, c0: float = 1.0, c_unneeded: float = 1.0) -> np.ndarray:
    """Notify z iff P(z impacted)*C_miss(sev) > (1-P)*C_unneeded  (spec 5.2.6). Returns boolean mask."""
    c_miss = c0 * (1 + 4 * severity)
    return zone_marginal * c_miss > (1 - zone_marginal) * c_unneeded


def scope_threshold(severity: float, c0: float = 1.0, c_unneeded: float = 1.0) -> float:
    return c_unneeded / (c0 * (1 + 4 * severity) + c_unneeded)


def prf(pred: set, truth: set, beta: float = 2.0):
    tp = len(pred & truth)
    p = tp / len(pred) if pred else (1.0 if not truth else 0.0)
    r = tp / len(truth) if truth else 1.0
    f = (1 + beta**2) * p * r / (beta**2 * p + r) if (p + r) else 0.0
    return p, r, f
