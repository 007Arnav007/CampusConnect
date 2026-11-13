"""Localization baselines (spec 5.2.9). Each returns a full ranking (best first) so Top-k/MRR are comparable."""
from __future__ import annotations

import numpy as np

from ..netsim.scenarios import Evidence
from ..netsim.topology import Topology


def _rank(topo: Topology, score: np.ndarray) -> list[str]:
    # ties broken by node order -> deterministic
    return [topo.nodes[i] for i in np.argsort(-score, kind="stable")]


def l_b1_telemetry_only(topo: Topology, ev: Evidence) -> list[str]:
    """argmax anomaly; move up to the parent when >= 60 % of its observed children are anomalous."""
    s = np.zeros(len(topo.nodes))
    for n, a in ev.anomaly.items(): s[topo.node_idx[n]] = a
    for p in topo.nodes:
        kids = [c for c in topo.children[p] if c in ev.anomaly]
        if len(kids) >= 2:
            frac = sum(ev.anomaly[c] > 0.5 for c in kids) / len(kids)
            if frac >= 0.6: s[topo.node_idx[p]] = max(s[topo.node_idx[p]], 0.5 + float(np.mean([ev.anomaly[c] for c in kids])))
    return _rank(topo, s)


def l_b2_ticket_only(topo: Topology, ev: Evidence) -> list[str]:
    """Classic ticket de-duplication: find hot zones, blame the serving device, escalate to a common ancestor
    only when several of its zones are hot. Broad nodes are penalised quadratically by hot-zone coverage."""
    zc = np.zeros(len(topo.zones))
    for tk in ev.tickets:
        for z, w in tk.zone_dist.items(): zc[topo.zone_idx[z]] += w
    total = max(zc.sum(), 1e-9)
    hot = zc >= max(1.5, 0.35 * zc.max())
    s = np.zeros(len(topo.nodes))
    for n in topo.nodes:
        i = topo.node_idx[n]
        zs = [topo.zone_idx[topo.ap_zone[n]]] if topo.ntype[n] == "AP" else list(np.where(topo.impact[i] > 0.99)[0])
        if not zs: zs = list(np.where(topo.impact[i] > 0)[0])
        if not zs: continue
        hz = [z for z in zs if hot[z]]
        if not hz: continue
        share = zc[hz].sum() / total
        s[i] = share * (len(hz) / len(zs)) ** 2
    return _rank(topo, s)


def l_b3_repo_heuristic(topo: Topology, ev: Evidence) -> list[str]:
    """The v1 repository heuristic: 0.55*anomaly + 0.45*centrality (centrality = share of nodes downstream)."""
    n = len(topo.nodes); s = np.zeros(n)
    for i, name in enumerate(topo.nodes):
        cen = (len(topo.descendants(name)) + 1) / n
        s[i] = 0.55 * ev.anomaly.get(name, 0.0) + 0.45 * cen
    return _rank(topo, s)


BASELINES = {"L-B1": l_b1_telemetry_only, "L-B2": l_b2_ticket_only, "L-B3": l_b3_repo_heuristic}
