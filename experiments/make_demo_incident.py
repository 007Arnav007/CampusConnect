"""Runs the real /v1/localize endpoint on fixed synthetic scenarios and exports the responses for the ops UI demo."""
import json
from fastapi.testclient import TestClient
from common import ROOT
from src.main import app
from src.netsim.scenarios import generate_scenario
from src.netsim.topology import build_topology

client = TestClient(app); topo = build_topology()
CASES = [("AP-radio-degradation", "AP_DEGRADED", 41, 0.0, "An access point's radio degrades; telemetry still reports. Reports are mixed English/mislocated."),
         ("Silent-switch", "SW_DOWN", 7, 0.2, "A floor switch dies: it and its APs go silent. Telemetry-only methods see 'nothing'; silence plus reports points at the switch."),
         ("Blind-AP", "AP_DEAD", 12, 0.3, "The faulty AP has no collector (blind spot). Only user reports and neighbouring telemetry can localise it.")]
out = {"topology": topo.to_json(), "cases": []}
for name, fam, seed, blind, blurb in CASES:
    sc = generate_scenario(topo, name, seed, fam, blind_frac=blind); steps = []
    for cp, ev in sc.evidence.items():
        body = {"checkpointMin": cp, "severity": 0.6, "unmonitored": sorted(ev.unmonitored),
                "telemetry": [{"nodeId": n, "anomaly": a} for n, a in ev.anomaly.items()], "missing": [n for n, s in ev.observed.items() if not s],
                "tickets": [{"id": str(i), "t": t.t, "zoneDist": t.zone_dist, "symptomProbs": t.symptom_probs} for i, t in enumerate(ev.tickets)]}
        r = client.post("/v1/localize", json=body).json()
        steps.append({"t": cp, "tickets": len(ev.tickets), "observedNodes": sum(1 for s in ev.observed.values() if s), "silentNodes": [n for n, s in ev.observed.items() if not s],
                      "blindNodes": sorted(ev.unmonitored), "result": r["result"], "mode": r["mode"], "modelVersion": r.get("modelVersion")})
    out["cases"].append({"name": name, "family": fam, "truth": sc.faults, "blurb": blurb, "blindFraction": blind, "steps": steps})
(ROOT / "frontend/public/demo/incidents.json").write_text(json.dumps(out))
for c in out["cases"]:
    s = c["steps"][3]; print(c["name"], "truth", c["truth"], "| t=5min top:", [(x["node"], x["p"]) for x in s["result"]["posterior"][:2]], "set", s["result"]["conformalSet"]["nodes"][:4], "review", s["result"]["needsReview"])
