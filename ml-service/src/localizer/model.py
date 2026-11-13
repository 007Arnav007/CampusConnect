"""Bayesian fault localizer (spec 5.2.3). Parameters are *fitted* by maximum likelihood on training scenarios.

log p(h|E) = log pi_h + dT(h) + dM(h) + dR(h) - log Z, each term measured relative to the no-fault hypothesis.
Nodes without a collector (`unmonitored`) are statically known and excluded from the telemetry and missingness
terms; a *monitored* node that goes silent is informative (a dead device or an unreachable subtree is silent).
"""
from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from itertools import combinations

import numpy as np
from scipy.special import gammaln, logsumexp

from ..netsim.scenarios import BG_SYMPTOM, SYMPTOMS, Evidence, Scenario, WINDOW_MIN, _state_map
from ..netsim.topology import Topology

GROUP = {"AP": "AP", "SW": "SW", "DSW": "SW", "RTR": "L3", "CORE": "L3", "FW": "L3", "GW": "L3",
         "DNS": "SVC", "DHCP": "SVC", "RADIUS": "SVC"}
STATES = ("H", "F", "I")
TAU_T = 2.0       # telemetry ramp after onset (minutes), shared with the generator's documented ramp


def _beta_logpdf(x, a, b):
    return (a - 1) * np.log(x) + (b - 1) * np.log1p(-x) + gammaln(a + b) - gammaln(a) - gammaln(b)


def _nb_logpmf(x, mu, phi):
    mu = np.maximum(mu, 1e-9)
    return (gammaln(x + phi) - gammaln(phi) - gammaln(x + 1) + phi * np.log(phi / (phi + mu)) + x * np.log(mu / (phi + mu)))


def exposure(t: float, tau0: float) -> float:
    """Integral of ramp(tau)=1-exp(-tau/tau0) over [0, t]."""
    return t - tau0 * (1 - np.exp(-t / tau0))


@dataclass
class Params:
    beta: dict = field(default_factory=dict)        # "state|group" -> [a, b]
    miss: dict = field(default_factory=dict)        # "state|group" -> P(telemetry missing)
    compat: dict = field(default_factory=dict)      # type -> {symptom: likelihood ratio}
    rho0: float = 0.0004
    rho_f: float = 0.012
    tau0: float = 1.5
    phi: float = 3.0
    pi_none: float = 0.9
    version: str = "bayes-1"

    def dump(self) -> str: return json.dumps(asdict(self), indent=2, sort_keys=True)
    @staticmethod
    def load(s: str) -> "Params": return Params(**json.loads(s))


def _moments_beta(x: np.ndarray, default=(2.0, 2.0)):
    if len(x) < 8: return default
    m, v = float(np.mean(x)), float(np.var(x)) + 1e-6
    k = max(m * (1 - m) / v - 1, 0.5)
    return (max(m * k, 0.3), max((1 - m) * k, 0.3))


def fit_params(topo: Topology, scenarios: list[Scenario], seed_ckpt: float = 10.0) -> Params:
    """Maximum-likelihood / moment fits on TRAINING scenarios only (ground-truth states are known there)."""
    obs: dict[str, list[float]] = {}; miss_cnt: dict[str, list[int]] = {}
    for sc in scenarios:
        ev = sc.evidence.get(seed_ckpt)
        if ev is None: continue
        st = _state_map(topo, sc.faults)
        for n, seen in ev.observed.items():
            key = f"{st.get(n, 'H')}|{GROUP[topo.ntype[n]]}"
            c = miss_cnt.setdefault(key, [0, 0]); c[0] += (0 if seen else 1); c[1] += 1
            if seen: obs.setdefault(key, []).append(ev.anomaly[n])
    p = Params()
    for s in STATES:
        for g in ("AP", "SW", "L3", "SVC"):
            key = f"{s}|{g}"
            x = np.array(obs.get(key, []))
            fallback = p.beta.get(f"H|{g}", (1.5, 12.0)) if s != "H" else (1.5, 12.0)
            p.beta[key] = list(_moments_beta(x, fallback if s == "H" else (4.0, 3.0)))
            m, n = miss_cnt.get(key, [0, 0])
            p.miss[key] = float((m + 1) / (n + 2))               # Laplace smoothing
    # ---- symptom compatibility likelihood ratios ----
    bg = np.ones(len(SYMPTOMS)) * 1e-3; per_type: dict[str, np.ndarray] = {}
    for sc in scenarios:
        ev = sc.evidence.get(seed_ckpt)
        if ev is None or len(sc.faults) != 1: continue
        f = sc.faults[0]; ti = topo.ntype[f]
        for tk in ev.tickets:
            vec = np.array([tk.symptom_probs[s] for s in SYMPTOMS])
            z = tk.true_zone
            if tk.t > 0 and topo.impact[topo.node_idx[f], topo.zone_idx[z]] > 0.3:
                per_type.setdefault(ti, np.ones(len(SYMPTOMS)) * 1e-3); per_type[ti] += vec
            elif tk.t <= 0 or topo.impact[topo.node_idx[f], topo.zone_idx[z]] == 0:
                bg += vec
    bgp = bg / bg.sum()
    for ti in set(topo.ntype.values()):
        v = per_type.get(ti, bg.copy()); v = v / v.sum()
        p.compat[ti] = {s: float(np.clip(v[i] / bgp[i], 0.3, 3.0)) for i, s in enumerate(SYMPTOMS)}
    # ---- reports model: rho0 closed form; (rho_f, tau0, phi) by grid on training likelihood ----
    N = np.array([topo.zone_users[z] for z in topo.zones], float)
    num = den = 0.0; rows = []
    for sc in scenarios:
        for cp in (3.0, 5.0, 10.0):
            ev = sc.evidence.get(cp)
            if ev is None: continue
            c = np.zeros(len(topo.zones))
            for tk in ev.tickets:
                for z, w in tk.zone_dist.items(): c[topo.zone_idx[z]] += w
            I = np.max([topo.impact[topo.node_idx[f]] for f in sc.faults], axis=0) if sc.faults else np.zeros(len(topo.zones))
            quiet = I == 0
            num += c[quiet].sum(); den += (N[quiet] * WINDOW_MIN).sum()
            rows.append((c, I, cp))
    p.rho0 = max(num / den, 1e-5)
    best = (-np.inf, None)
    for rho_f in (0.004, 0.006, 0.008, 0.012, 0.016, 0.024):
        for tau0 in (0.75, 1.5, 3.0):
            for phi in (1.0, 2.0, 4.0, 8.0, 16.0, 32.0):
                ll = 0.0
                for c, I, cp in rows:
                    mu = N * (p.rho0 * WINDOW_MIN + (rho_f - p.rho0) * I * exposure(cp, tau0))
                    ll += float(_nb_logpmf(c, mu, phi).sum())
                if ll > best[0]: best = (ll, (rho_f, tau0, phi))
    p.rho_f, p.tau0, p.phi = best[1]
    return p


@dataclass
class Posterior:
    nodes: list[str]                        # node ids; index aligned with p_node
    p_none: float
    p_node: np.ndarray                      # marginal P(node is faulty), sums (with p_none) to ~1
    hyps: list[tuple[str, ...]]
    logp: np.ndarray
    decomposition: dict[str, dict[str, float]]
    zone_marginal: np.ndarray | None = None

    def ranking(self) -> list[str]:
        return [self.nodes[i] for i in np.argsort(-self.p_node, kind="stable")]


class Localizer:
    VARIANTS = ("full", "tel_only", "rep_only", "no_missingness")

    def __init__(self, topo: Topology, params: Params, variant: str = "full", pairs: bool = False, top_m: int = 8):
        assert variant in self.VARIANTS
        self.topo, self.p, self.variant, self.pairs, self.top_m = topo, params, variant, pairs, top_m
        self.types = [topo.ntype[n] for n in topo.nodes]
        self.N = np.array([topo.zone_users[z] for z in topo.zones], float)
        self.log_prior = np.array([np.log((1 - params.pi_none) * topo.prior[n]) for n in topo.nodes])
        self.log_pi_none = float(np.log(params.pi_none))
        self.desc_idx = {n: [topo.node_idx[d] for d in topo.full_loss_desc[n]] for n in topo.nodes}
        self.compat_mat = {ti: np.array([params.compat[ti][s] for s in SYMPTOMS]) for ti in params.compat}

    # --- evidence -> per-node, per-state telemetry/missingness log-likelihoods ---
    def _node_tables(self, ev: Evidence):
        n = len(self.topo.nodes); ramp = 1 - np.exp(-ev.t_min / TAU_T)
        LT = np.zeros((n, 3)); LM = np.zeros((n, 3))
        for i, name in enumerate(self.topo.nodes):
            if name in ev.unmonitored: continue
            g = GROUP[self.types[i]]; seen = ev.observed.get(name, False)
            a = np.clip(ev.anomaly.get(name, 0.5), 1e-3, 1 - 1e-3)
            for si, s in enumerate(STATES):
                aa, bb = self.p.beta[f"{s}|{g}"]; pm = self.p.miss[f"{s}|{g}"]
                if s != "H":                          # onset mixture: fault state emerges with the ramp
                    ha, hb = self.p.beta[f"H|{g}"]; hm = self.p.miss[f"H|{g}"]
                    pm = ramp * pm + (1 - ramp) * hm
                    lik = lambda x: np.log(ramp * np.exp(_beta_logpdf(x, aa, bb)) + (1 - ramp) * np.exp(_beta_logpdf(x, ha, hb)) + 1e-300)
                else:
                    lik = lambda x: _beta_logpdf(x, aa, bb)
                if seen:
                    LT[i, si] = lik(a); LM[i, si] = np.log(1 - pm + 1e-12)
                else:
                    LM[i, si] = np.log(pm + 1e-12)
        return LT, LM

    def _tickets(self, ev: Evidence):
        """Raw soft zone counts + per-ticket zone weights W[t,z] and symptom likelihood ratios L[t,type]."""
        Z, types = len(self.topo.zones), sorted(self.p.compat)
        raw = np.zeros(Z); W = np.zeros((len(ev.tickets), Z)); L = np.ones((len(ev.tickets), len(types)))
        for ti, tk in enumerate(ev.tickets):
            sym = np.array([tk.symptom_probs[s] for s in SYMPTOMS])
            for z, w in tk.zone_dist.items():
                W[ti, self.topo.zone_idx[z]] = w; raw[self.topo.zone_idx[z]] += w
            for k, t in enumerate(types): L[ti, k] = float(sym @ self.compat_mat[t])
        return raw, W, L, {t: k for k, t in enumerate(types)}

    def posterior(self, ev: Evidence) -> Posterior:
        topo, p, v = self.topo, self.p, self.variant
        LT, LM = self._node_tables(ev)
        use_t, use_m, use_r = v in ("full", "tel_only", "no_missingness"), v == "full", v in ("full", "rep_only", "no_missingness")
        raw, W, Ltk, tidx = self._tickets(ev)
        base_mu = self.N * p.rho0 * WINDOW_MIN
        base_r = _nb_logpmf(raw, base_mu, p.phi)
        E = exposure(ev.t_min, p.tau0)
        H = len(topo.nodes)
        dT = np.zeros(H); dM = np.zeros(H); dR = np.zeros(H)
        for hi, name in enumerate(topo.nodes):
            changed = [(hi, 1)] + [(j, 2) for j in self.desc_idx[name]]
            dT[hi] = sum(LT[j, s] - LT[j, 0] for j, s in changed)
            dM[hi] = sum(LM[j, s] - LM[j, 0] for j, s in changed)
            mu = self.N * (p.rho0 * WINDOW_MIN + (p.rho_f - p.rho0) * topo.impact[hi] * E)
            nb = float((_nb_logpmf(raw, mu, p.phi) - base_r).sum())                  # how many reports
            f = np.clip((mu - base_mu) / np.maximum(mu, 1e-9), 0.0, 1.0)             # share of reports caused by the fault
            if len(W):                                                              # what kind of reports (mixture vs background)
                lr = Ltk[:, tidx[self.types[hi]]][:, None]
                nb += float((W * np.log1p(f[None, :] * (lr - 1.0))).sum())
            dR[hi] = nb
        score = (dT if use_t else 0) + (dM if use_m else 0) + (dR if use_r else 0)
        single = self.log_prior - self.log_pi_none + score          # relative to the empty hypothesis (0)
        hyps: list[tuple[str, ...]] = [()] + [(n,) for n in topo.nodes]
        logp = np.concatenate([[0.0], single])
        parts = {"telemetry": dT if use_t else np.zeros(H), "missingness": dM if use_m else np.zeros(H),
                 "reports": dR if use_r else np.zeros(H)}
        if self.pairs:
            top = np.argsort(-single)[: self.top_m]
            for i, j in combinations(top, 2):
                a, b = topo.nodes[i], topo.nodes[j]
                if (b in topo.full_loss_desc[a]) or (a in topo.full_loss_desc[b]): continue
                if np.minimum(topo.impact[i], topo.impact[j]).max() > 0: continue      # additivity needs disjoint impact
                hyps.append((a, b)); logp = np.append(logp, single[i] + single[j] + np.log(0.1))
        logp = logp - logsumexp(logp)
        p_node = np.zeros(H)
        for lp, h in zip(logp, hyps):
            for n in h: p_node[topo.node_idx[n]] += np.exp(lp)
        top_idx = np.argsort(-p_node)[:5]
        decomp = {topo.nodes[i]: {"telemetry": float(parts["telemetry"][i]), "missingness": float(parts["missingness"][i]),
                                  "reports": float(parts["reports"][i]), "prior": float(self.log_prior[i] - self.log_pi_none)}
                  for i in top_idx}
        pz = np.zeros(len(topo.zones))
        for lp, h in zip(logp, hyps):
            if not h: continue
            nz = np.ones(len(topo.zones))
            for n in h: nz *= 1 - topo.impact[topo.node_idx[n]]
            pz += np.exp(lp) * (1 - nz)
        return Posterior(topo.nodes, float(np.exp(logp[0])), p_node, hyps, logp, decomp, pz)
