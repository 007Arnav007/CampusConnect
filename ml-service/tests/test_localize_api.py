from fastapi.testclient import TestClient

from src.main import app
from src.netsim.scenarios import generate_scenario
from src.netsim.topology import build_topology

client = TestClient(app)
topo = build_topology()


def _payload(sc, cp=5.0):
    ev = sc.evidence[cp]
    return {"checkpointMin": cp, "severity": 0.6, "unmonitored": sorted(ev.unmonitored),
            "telemetry": [{"nodeId": n, "anomaly": a} for n, a in ev.anomaly.items()],
            "missing": [n for n, seen in ev.observed.items() if not seen],
            "tickets": [{"id": str(i), "t": t.t, "zoneDist": t.zone_dist, "symptomProbs": t.symptom_probs} for i, t in enumerate(ev.tickets)]}


def test_localize_finds_a_dead_switch_and_is_deterministic():
    sc = generate_scenario(topo, "t", 7, "SW_DOWN")
    a = client.post("/v1/localize", json=_payload(sc)).json(); b = client.post("/v1/localize", json=_payload(sc)).json()
    assert a["mode"] == "trained-artifact" and a["result"] == b["result"]                      # AT-LOC-1
    assert sc.faults[0] in [x["node"] for x in a["result"]["posterior"][:3]]
    assert a["result"]["conformalSet"]["size"] >= 1


def test_localize_rejects_unknown_nodes_and_zones_and_extra_fields():
    assert client.post("/v1/localize", json={"telemetry": [{"nodeId": "NOPE", "anomaly": .5}]}).status_code == 422
    assert client.post("/v1/localize", json={"tickets": [{"t": 1, "zoneDist": {"MARS": 1}, "symptomProbs": {"LINK": 1}}]}).status_code == 422
    assert client.post("/v1/localize", json={"surprise": 1}).status_code == 422


def test_internal_token_enforced_when_configured(monkeypatch):
    monkeypatch.setenv("INTERNAL_SERVICE_TOKEN", "t" * 40)
    assert client.post("/v1/localize", json={}).status_code == 401
    assert client.post("/v1/localize", json={}, headers={"X-Internal-Service-Token": "t" * 40}).status_code == 200


def test_latency_budget_at_100_nodes_500_tickets():                                            # AT-LOC-2
    import time
    sc = generate_scenario(topo, "t", 9, "SW_DOWN", checkpoints=(10.0,)); p = _payload(sc, 10.0)
    p["tickets"] = (p["tickets"] * 4)[:500]
    t = time.perf_counter(); r = client.post("/v1/localize", json=p); assert r.status_code == 200
    assert time.perf_counter() - t < 2.0
