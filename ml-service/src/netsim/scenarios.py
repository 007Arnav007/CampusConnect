"""Deterministic scenario generator: telemetry (with informative missingness) + user reports over a topology.

The generator is intentionally *richer than the model that is evaluated on it* (heterogeneous fault families,
per-scenario reporter propensity, clustered reports, mislocation, vague locations) so that the localizer is never
scored on data drawn from its own likelihood. Every number in experiments comes from running this code.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable

import numpy as np

from .topology import Topology

SYMPTOMS = ["LINK", "PERF", "NETWORK", "AUTH", "OTHER"]
BG_SYMPTOM = np.array([0.20, 0.40, 0.15, 0.10, 0.15])
CHECKPOINTS = (1.0, 2.0, 3.0, 5.0, 8.0, 10.0)   # minutes after onset
WINDOW_MIN = 10.0

# fault family -> (node-type filter, telemetry-observed probability, anomaly Beta(a,b), symptom distribution)
FAMILIES: dict[str, dict] = {
    "AP_DEGRADED":  {"types": ["AP"],     "obs": 0.92, "beta": (5.0, 2.5), "sym": [0.40, 0.50, 0.05, 0.00, 0.05], "w": 3.0},
    "AP_DEAD":      {"types": ["AP"],     "obs": 0.10, "beta": (5.0, 2.5), "sym": [0.70, 0.15, 0.10, 0.00, 0.05], "w": 2.0},
    "SW_DOWN":      {"types": ["SW"],     "obs": 0.20, "beta": (5.0, 2.5), "sym": [0.55, 0.10, 0.30, 0.00, 0.05], "w": 1.5},
    "DSW_DOWN":     {"types": ["DSW"],    "obs": 0.20, "beta": (5.0, 2.5), "sym": [0.50, 0.10, 0.35, 0.00, 0.05], "w": 0.6},
    "RTR_DEGRADED": {"types": ["RTR"],    "obs": 0.90, "beta": (5.0, 2.5), "sym": [0.05, 0.60, 0.30, 0.00, 0.05], "w": 0.5},
    "DNS_FAULT":    {"types": ["DNS"],    "obs": 0.90, "beta": (5.5, 2.0), "sym": [0.00, 0.10, 0.80, 0.00, 0.10], "w": 0.5},
    "DHCP_FAULT":   {"types": ["DHCP"],   "obs": 0.90, "beta": (5.5, 2.0), "sym": [0.05, 0.05, 0.70, 0.10, 0.10], "w": 0.4},
    "RADIUS_FAULT": {"types": ["RADIUS"], "obs": 0.90, "beta": (5.5, 2.0), "sym": [0.00, 0.05, 0.10, 0.80, 0.05], "w": 0.4},
    "CORE_FAIL":    {"types": ["CORE"],   "obs": 0.15, "beta": (5.0, 2.5), "sym": [0.40, 0.10, 0.45, 0.00, 0.05], "w": 0.1},
    "WAN_FAULT":    {"types": ["GW", "FW"], "obs": 0.90, "beta": (5.0, 2.5), "sym": [0.00, 0.35, 0.55, 0.00, 0.10], "w": 0.4},
}
FAULT_FAMILIES = list(FAMILIES)


@dataclass
class Ticket:
    t: float                         # minutes relative to onset (negative = before onset)
    zone_dist: dict[str, float]
    symptom_probs: dict[str, float]
    true_zone: str = ""
    mislocated: bool = False


@dataclass
class Evidence:
    t_min: float                     # checkpoint minutes after onset
    anomaly: dict[str, float]        # observed monitored nodes only
    observed: dict[str, bool]        # monitored nodes: True if telemetry arrived this window
    unmonitored: frozenset[str]      # nodes with no collector (statically known)
    tickets: list[Ticket]


@dataclass
class Scenario:
    sid: str
    family: str
    faults: list[str]
    seed: int
    evidence: dict[float, Evidence] = field(default_factory=dict)

    @property
    def label(self) -> str:
        return self.faults[0] if self.faults else "NONE"


def _state_map(topo: Topology, faults: Iterable[str]) -> dict[str, str]:
    st: dict[str, str] = {}
    for f in faults:
        st[f] = "F"
        for d in topo.full_loss_desc[f]:
            st.setdefault(d, "I")
    return st


def _beta(rng, a, b, n=None):
    return np.clip(rng.beta(a, b, size=n), 1e-3, 1 - 1e-3)


def generate_scenario(topo: Topology, sid: str, seed: int, family: str, *, blind_frac: float = 0.0, blind_mode: str = "mcar",
                      mislocate: float = 0.10, rho_scale: float = 1.0, vague_share: float = 0.15, n_faults: int = 1,
                      checkpoints: tuple[float, ...] = CHECKPOINTS, hinglish_noise: float = 0.0) -> Scenario:
    rng = np.random.default_rng(seed)
    nodes = topo.nodes
    # ---- ground truth ----
    faults: list[str] = []
    if family in FAMILIES:
        fam = FAMILIES[family]
        pool = [n for n in nodes if topo.ntype[n] in fam["types"]]
        faults = [str(rng.choice(pool))]
        if n_faults == 2:     # a second, disjoint AP fault
            others = [n for n in nodes if topo.ntype[n] == "AP" and topo.ap_zone[n] != topo.ap_zone.get(faults[0], "")]
            faults.append(str(rng.choice(others)))
    states = _state_map(topo, faults)
    # ---- monitoring coverage (blind spots) ----
    unmonitored: set[str] = set()
    if blind_frac > 0:
        k = int(round(blind_frac * len(nodes)))
        unmonitored = set(rng.choice(nodes, size=k, replace=False).tolist())
        if blind_mode == "mnar" and faults:        # the faulty device is blind with prob min(1, 5b); stress test
            if rng.random() < min(1.0, 5 * blind_frac):
                unmonitored.update(faults)
                unmonitored.update(topo.full_loss_desc[faults[0]])
    # ---- per-scenario reporter behaviour ----
    s_prop = float(np.exp(rng.normal(0, 0.25))) * rho_scale
    rho0, rho_f = 0.0004, 0.012 * s_prop       # reports / user / minute (baseline, fully developed fault)
    tau_rep = 1.5
    zone_gamma = {z: rng.gamma(3.0, 1 / 3.0) for z in topo.zones}   # clustered, bursty reporting
    sym_dist = np.array(FAMILIES[family]["sym"]) if family in FAMILIES else BG_SYMPTOM
    surge_zone = str(rng.choice(topo.zones)) if family == "BENIGN_SURGE" else None
    surge_aps = set(topo.zone_aps[surge_zone]) if surge_zone else set()
    if surge_zone:
        b_ = topo.zone_building[surge_zone]
        surge_aps |= {a for a in nodes if topo.ntype[a] == "AP" and topo.zone_building[topo.ap_zone[a]] == b_ and rng.random() < 0.25}

    # ---- tickets: thinning over a fine time grid for the whole window ----
    all_tickets: list[Ticket] = []
    step = 0.25
    for z in topo.zones:
        N = topo.zone_users[z]
        I = max((topo.impact[topo.node_idx[f], topo.zone_idx[z]] for f in faults), default=0.0)
        for t in np.arange(-WINDOW_MIN + step, max(checkpoints) + step / 2, step):
            ramp = (1 - np.exp(-t / tau_rep)) if t > 0 else 0.0
            rate = N * (rho0 + (rho_f - rho0) * I * ramp) * zone_gamma[z]
            if z == surge_zone: rate = N * rho0 * 12 * zone_gamma[z] * (1 if t > 0 else 0.3)
            for _ in range(rng.poisson(rate * step)):
                is_fault_ticket = I > 0 and t > 0 and rng.random() < (rho_f - rho0) * I * ramp / max(rho0 + (rho_f - rho0) * I * ramp, 1e-9)
                p_sym = sym_dist if is_fault_ticket else BG_SYMPTOM
                true_sym = int(rng.choice(5, p=p_sym / p_sym.sum()))
                probs = 0.65 * np.eye(5)[true_sym] + 0.35 * rng.dirichlet(np.ones(5))
                if hinglish_noise > 0 and rng.random() < hinglish_noise:      # classifier is less sure on code-mixed text
                    probs = 0.3 * np.eye(5)[true_sym] + 0.7 * rng.dirichlet(np.ones(5))
                stated, mis = z, False
                if rng.random() < mislocate:
                    stated, mis = str(rng.choice(topo.adjacent_zones(z))), True
                adj = topo.adjacent_zones(stated)
                if rng.random() < vague_share:                                # "somewhere in the library"
                    bz = [o for o in topo.zones if topo.zone_building[o] == topo.zone_building[stated]]
                    zd = {o: 1 / len(bz) for o in bz}
                else:
                    zd = {stated: 0.75}
                    near = adj[:3]
                    for o in near: zd[o] = zd.get(o, 0) + 0.25 / len(near)
                all_tickets.append(Ticket(float(t + rng.uniform(0, step)), zd, dict(zip(SYMPTOMS, probs.tolist())), z, mis))

    # ---- telemetry at checkpoints ----
    sc = Scenario(sid, family, faults, seed)
    # persistent per-node dropout (collector glitch) draws so checkpoints are coherent
    dropout = {n: rng.random() for n in nodes}
    healthy_draw = {n: rng.random() for n in nodes}
    for cp in checkpoints:
        ramp_t = 1 - np.exp(-cp / 2.0)
        anomaly: dict[str, float] = {}; observed: dict[str, bool] = {}
        for n in nodes:
            if n in unmonitored: continue
            st = states.get(n, "H")
            eff = st if (st != "H" and rng.random() < ramp_t) else "H"
            if eff == "F":
                fam = FAMILIES[family]; p_obs = fam["obs"]; ab = fam["beta"]
            elif eff == "I":
                p_obs = 0.15; ab = (3.0, 6.0)
            else:
                p_obs = 0.97; ab = (1.5, 12.0)
                if n in surge_aps and cp >= 1: ab = (3.5, 4.0)
            seen = dropout[n] < p_obs if eff != "H" else rng.random() < p_obs
            observed[n] = bool(seen)
            if seen: anomaly[n] = float(_beta(rng, *ab))
        tick = [t for t in all_tickets if t.t <= cp and t.t >= cp - WINDOW_MIN]
        sc.evidence[cp] = Evidence(cp, anomaly, observed, frozenset(unmonitored), tick)
    return sc


def generate_dataset(topo: Topology, n: int, seed: int, *, benign_share: float = 0.15, families: list[str] | None = None,
                     pair_share: float = 0.0, **kw) -> list[Scenario]:
    rng = np.random.default_rng(seed)
    fams = families or FAULT_FAMILIES
    w = np.array([FAMILIES[f]["w"] for f in fams]); w = w / w.sum()
    out = []
    for i in range(n):
        s = int(rng.integers(0, 2**31 - 1))
        if rng.random() < benign_share:
            fam = "BENIGN_SURGE" if rng.random() < 0.5 else "NONE"
            out.append(generate_scenario(topo, f"S{seed}-{i}", s, fam, **kw))
        else:
            fam = str(rng.choice(fams, p=w))
            nf = 2 if (fam.startswith("AP_") and rng.random() < pair_share) else 1
            out.append(generate_scenario(topo, f"S{seed}-{i}", s, fam, n_faults=nf, **kw))
    return out
