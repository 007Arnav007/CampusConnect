from fastapi.testclient import TestClient
from src.main import app

client = TestClient(app)
FEATURES = {"packetLoss": .2, "rttMs": 150, "jitterMs": 20, "gatewayLoad": .9}

def test_health_and_anomaly():
    assert client.get("/health").json()["mode"] == "heuristic-fallback"
    result = client.post("/api/v1/ml/anomaly", json={"nodeId": "AP-1", "features": FEATURES})
    assert result.status_code == 200
    assert 0 <= result.json()["anomalyScore"] <= 1

def test_policy_is_bounded():
    body = {"messageClass": "CRITICAL_EVENT", "severity": 1, "deadlineMs": 1000,
            "network": {"packetLoss": .2, "rttMs": 140, "jitterMs": 42},
            "receiver": {"healthy": True, "historicalSuccess": .94}}
    result = client.post("/api/v1/ml/policy-score", json=body)
    assert result.status_code == 200
    assert result.json()["retries"] <= 5

def test_payload_rejected_when_out_of_bounds():
    result = client.post("/api/v1/ml/anomaly", json={"nodeId": "x", "features": {"packetLoss": 2}})
    assert result.status_code == 422
