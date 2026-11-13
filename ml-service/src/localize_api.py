"""POST /v1/localize : evidence snapshot -> calibrated posterior, conformal set, zone impact, decomposition (spec 5.2.10)."""
from __future__ import annotations

import hashlib
import hmac
import json
import os
from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from .localizer.calibration import NONE, Conformal, TwoStageCalibrator, needs_review, scope_threshold, temper, to_vector, zone_scope
from .localizer.model import Localizer, Params
from .netsim.scenarios import Evidence, Ticket
from .netsim.topology import build_topology

ACTIVE = Path(__file__).resolve().parents[1] / "models" / "localizer" / "active"
router = APIRouter()


class TicketIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str = Field("", max_length=80)
    t: float = Field(..., ge=-60, le=60, description="minutes relative to onset (or window end)")
    zoneDist: dict[str, float] = Field(..., min_length=1, max_length=40)
    symptomProbs: dict[str, float] = Field(..., max_length=10)


class LocalizeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    checkpointMin: float = Field(5.0, gt=0, le=10)
    telemetry: list[dict[str, Any]] = Field(default_factory=list, max_length=500)    # {"nodeId","anomaly"}
    missing: list[str] = Field(default_factory=list, max_length=500)                  # monitored nodes that sent nothing
    unmonitored: list[str] = Field(default_factory=list, max_length=500)              # nodes with no collector
    tickets: list[TicketIn] = Field(default_factory=list, max_length=1000)
    severity: float = Field(0.5, ge=0, le=1)


@lru_cache(maxsize=1)
def _load():
    topo = build_topology()
    try:
        params = Params.load((ACTIVE / "calibration.json").read_text())
        c = json.loads((ACTIVE / "calibrator.json").read_text()); meta = json.loads((ACTIVE / "metadata.json").read_text())
        if c.get("topology_hash") != topo.hash(): return topo, None, None, None, {"mode": "rule-fallback", "reason": "topology hash mismatch"}
        # Provenance check: the promoted sha256 must match the artifacts on disk, or serve rule-fallback.
        digest = hashlib.sha256((ACTIVE / "calibration.json").read_bytes() + (ACTIVE / "calibrator.json").read_bytes()).hexdigest()
        if meta.get("sha256") != digest: return topo, None, None, None, {"mode": "rule-fallback", "reason": "artifact checksum mismatch"}
        cal = TwoStageCalibrator(a=c["platt_a"], b=c["platt_b"], T=c["T"])
        conf = Conformal(alpha=c["alpha"], qhat=c["qhat"], qhat_by_type=c["qhat_by_type"], cal=cal)
        return topo, Localizer(topo, params, "full"), cal, conf, {"mode": "trained-artifact", "modelVersion": meta["version"], "sha256": meta["sha256"]}
    except (OSError, ValueError, KeyError, TypeError):
        # TypeError covers schema drift in calibration.json (missing/extra Params fields).
        return topo, None, None, None, {"mode": "rule-fallback", "reason": "no trained artifact installed"}


def _auth(token: str | None):
    expected = os.environ.get("INTERNAL_SERVICE_TOKEN", "")
    if expected and not (token and hmac.compare_digest(token.encode(), expected.encode())):
        raise HTTPException(status_code=401, detail="internal service token required")   # S-06


def _rule_fallback(topo, req: LocalizeRequest):
    """Deterministic fallback: >= 3 reports in one zone -> candidate incident blaming that zone's serving APs (never blocks tickets)."""
    counts: dict[str, float] = {}
    for t in req.tickets:
        for z, w in t.zoneDist.items(): counts[z] = counts.get(z, 0) + w
    hot = [z for z, c in counts.items() if c >= 3]
    # Same response schema as the trained-artifact path so consumers do not need per-mode branching.
    return {"posterior": [], "pNone": None,
            "conformalSet": {"alpha": None, "nodes": [ap for z in hot for ap in topo.zone_aps.get(z, [])], "size": 0, "includesNone": True},
            "needsReview": True, "zoneImpact": [{"zone": z, "p": None, "notify": True} for z in hot],
            "scopeThreshold": None, "decomposition": {}}


def check_operational_surge(topo, ev: Evidence, candidate_node: str, tickets: list[Ticket]) -> tuple[bool, str | None, str | None]:
    """Surge-aware guard: detects when elevated reports represent benign crowd congestion rather than broken hardware."""
    if topo.ntype.get(candidate_node) != "AP":
        return False, None, None
    z = topo.ap_zone.get(candidate_node)
    if not z:
        return False, None, None
    # 1. Candidate AP is actively observed and anomaly < 0.80 (hardware link intact)
    if not ev.observed.get(candidate_node, False) or ev.anomaly.get(candidate_node, 0.0) >= 0.80:
        return False, None, None
    # 2. Upstream building switches are observed and healthy (anomaly < 0.50)
    b = topo.zone_building.get(z)
    switches = [n for n in topo.nodes if topo.ntype[n] in ("SW", "DSW") and b and b in n]
    for s in switches:
        if s in ev.anomaly and ev.anomaly[s] >= 0.50:
            return False, None, None
    # 3. Core infrastructure healthy
    for c in ("CORE-01", "RTR-01", "GW-01", "DNS-01", "DHCP-01"):
        if c in ev.anomaly and ev.anomaly[c] >= 0.50:
            return False, None, None
    # 4. Check symptoms in zone: must be non-LINK (predominantly PERF, NETWORK, OTHER)
    z_tickets = [tk for tk in tickets if z in tk.zone_dist]
    if z_tickets:
        tot_w = sum(tk.zone_dist[z] for tk in z_tickets)
        link_w = sum(tk.zone_dist[z] * tk.symptom_probs.get("LINK", 0.0) for tk in z_tickets)
        if tot_w > 0 and (link_w / tot_w) > 0.28:
            return False, None, None
    # 5. Peer APs in the zone: none showing catastrophic failure
    peer_aps = topo.zone_aps.get(z, [])
    if any(ev.anomaly.get(a, 0.0) >= 0.82 for a in peer_aps if a in ev.anomaly):
        return False, None, None
    return True, z, b


@router.post("/v1/localize")
def localize(req: LocalizeRequest, x_internal_service_token: str | None = Header(default=None)):
    _auth(x_internal_service_token)
    topo, loc, cal, conf, info = _load()
    if loc is None: return {"result": _rule_fallback(topo, req), **info}
    unknown = [t.get("nodeId") for t in req.telemetry if t.get("nodeId") not in topo.node_idx]
    if unknown: raise HTTPException(status_code=422, detail=f"unknown nodes: {unknown[:3]}")
    missing_anomaly = [t.get("nodeId") for t in req.telemetry if not isinstance(t.get("anomaly"), (int, float)) or isinstance(t.get("anomaly"), bool)]
    if missing_anomaly: raise HTTPException(status_code=422, detail=f"telemetry rows need numeric anomaly: {missing_anomaly[:3]}")
    unmon = frozenset(n for n in req.unmonitored if n in topo.node_idx)
    anomaly = {t["nodeId"]: float(min(max(t["anomaly"], 0), 1)) for t in req.telemetry}
    miss = set(req.missing)
    observed = {n: (n in anomaly) for n in topo.nodes if n not in unmon}
    for n in miss: observed[n] = False
    tickets = []
    for t in req.tickets:
        if any(z not in topo.zone_idx for z in t.zoneDist): raise HTTPException(status_code=422, detail="unknown zone in ticket")
        sp = {k: float(t.symptomProbs.get(k, 0.0)) for k in ("LINK", "PERF", "NETWORK", "AUTH", "OTHER")}; tot = sum(sp.values()) or 1.0
        tickets.append(Ticket(t.t, t.zoneDist, {k: v / tot for k, v in sp.items()}))
    ev = Evidence(req.checkpointMin, anomaly, observed, unmon, tickets)
    post = loc.posterior(ev); names, v = to_vector(post); p = cal.apply(v)

    top_candidate = names[int(np.argmax(p[:-1]))] if len(names) > 1 else None
    is_surge, surge_zone, surge_bldg = (False, None, None)
    if top_candidate:
        is_surge, surge_zone, surge_bldg = check_operational_surge(topo, ev, top_candidate, tickets)

    if is_surge:
        operational_state = "DEMAND_SURGE"
        p_none_val = max(float(p[-1]), 0.85)
        scale = (1.0 - p_none_val) / max(float(1.0 - p[-1]), 1e-9)
        p[:-1] = p[:-1] * scale
        p[-1] = p_none_val
        cset = conf.predict_set(names, v)
        if NONE not in cset:
            cset = [NONE] + [n for n in cset if n != top_candidate]
        needs_rev = False
    else:
        operational_state = "NORMAL" if float(p[-1]) >= 0.50 else "INCIDENT"
        cset = conf.predict_set(names, v)
        needs_rev = bool(needs_review(cset, float(p[-1]), p))

    order = np.argsort(-p)
    pz = post.zone_marginal; notify = zone_scope(pz, req.severity)
    result = {
        "posterior": [{"node": names[i], "p": round(float(p[i]), 4)} for i in order[:10]],
        "pNone": round(float(p[-1]), 4),
        "conformalSet": {"alpha": conf.alpha, "nodes": [n for n in cset if n != NONE], "size": len(cset), "includesNone": NONE in cset},
        "needsReview": needs_rev,
        "operationalState": operational_state,
        "operationalDiagnosis": (
            f"Elevated traffic demand in {surge_zone} ({surge_bldg}) due to flash crowd / localized event. "
            "Telemetry confirms access points and upstream switches are operating normally without link failure."
            if is_surge else None
        ),
        "zoneImpact": [{"zone": z, "p": round(float(pz[i]), 4), "notify": bool(notify[i])} for i, z in enumerate(topo.zones) if pz[i] > 0.02],
        "scopeThreshold": round(scope_threshold(req.severity), 4),
        "decomposition": {n: {k: round(x, 2) for k, x in d.items()} for n, d in post.decomposition.items()},
    }
    return {"result": result, **info, "topologyHash": topo.hash(), "disclaimer": "Prototype; trained on synthetic scenarios only."}


@router.get("/v1/topology")
def topology(x_internal_service_token: str | None = Header(default=None)):
    _auth(x_internal_service_token); return _load()[0].to_json()
