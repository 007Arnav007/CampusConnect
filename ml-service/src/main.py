from __future__ import annotations

import uuid
from typing import Any, Literal
from fastapi import FastAPI
from pydantic import BaseModel, Field, ConfigDict
from .model_registry import list_models, load_anomaly_model

from .localize_api import router as localize_router

app = FastAPI(title="CampusConnect ML Service", version="2.0.0")
app.include_router(localize_router)

class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

class Features(StrictModel):
    packetLoss: float = Field(0, ge=0, le=1)
    rttMs: float = Field(0, ge=0, le=60000)
    jitterMs: float = Field(0, ge=0, le=60000)
    throughputMbps: float = Field(0, ge=0, le=100000)
    connectionFailures: int = Field(0, ge=0, le=100000)
    websocketFailures: int = Field(0, ge=0, le=100000)
    tcpAckLatencyMs: float = Field(0, ge=0, le=60000)
    udpAckLatencyMs: float = Field(0, ge=0, le=60000)
    gatewayLoad: float = Field(0, ge=0, le=1)
    receiverHealth: float = Field(1, ge=0, le=1)
    tickets5m: int = Field(0, ge=0, le=10000)
    affectedUsers: int = Field(0, ge=0, le=1000000)

class AnomalyRequest(StrictModel):
    nodeId: str = Field(..., min_length=1, max_length=80)
    features: Features

class Ticket(StrictModel):
    id: str = Field("", max_length=80)
    category: str = Field("", max_length=80)
    location: str = Field("", max_length=160)
    serviceId: str = Field("", max_length=80)
    text: str = Field("", max_length=2000)
    timestampMinutesAgo: float = Field(0, ge=0, le=10080)

class CorrelateRequest(StrictModel):
    ticket: Ticket
    activeIncidents: list[dict[str, Any]] = Field(default_factory=list, max_length=100)
    networkState: Features
    topology: dict[str, Any] = Field(default_factory=dict)

class RootCauseRequest(StrictModel):
    candidates: list[dict[str, Any]] = Field(..., min_length=1, max_length=100)
    networkState: Features
    tickets: list[Ticket] = Field(default_factory=list, max_length=500)

class ImpactRequest(StrictModel):
    affectedUsers: int = Field(0, ge=0, le=1000000)
    affectedNodes: int = Field(0, ge=0, le=10000)
    serviceCriticality: float = Field(0, ge=0, le=1)
    durationMinutes: float = Field(0, ge=0, le=10080)
    ticketVelocity: float = Field(0, ge=0, le=10000)
    predictedPropagation: float = Field(0, ge=0, le=1)

class PropagationRequest(StrictModel):
    currentNodes: list[str] = Field(..., min_length=1, max_length=100)
    neighbors: dict[str, list[str]] = Field(default_factory=dict, max_length=500)
    networkState: Features

class Network(StrictModel):
    packetLoss: float = Field(0, ge=0, le=1)
    rttMs: float = Field(0, ge=0, le=60000)
    jitterMs: float = Field(0, ge=0, le=60000)

class Receiver(StrictModel):
    healthy: bool = True
    historicalSuccess: float = Field(0, ge=0, le=1)

class PolicyRequest(StrictModel):
    messageClass: Literal["NORMAL", "LIVE", "RELIABLE", "CRITICAL_EVENT"] = "NORMAL"
    severity: float = Field(0, ge=0, le=1)
    deadlineMs: int = Field(1000, ge=50, le=120000)
    network: Network
    receiver: Receiver

def clamp(value: float) -> float:
    return max(0.0, min(1.0, value))

def anomaly_score(f: Features) -> float:
    return round(clamp(
        0.30 * f.packetLoss + 0.20 * min(f.rttMs / 500, 1) +
        0.15 * min(f.jitterMs / 200, 1) + 0.15 * f.gatewayLoad +
        0.10 * min(f.websocketFailures / 20, 1) +
        0.10 * (1 - f.receiverHealth)), 4)

def evidence_for(f: Features) -> list[str]:
    evidence = []
    if f.packetLoss > .05: evidence.append(f"Packet loss is elevated at {f.packetLoss:.1%}")
    if f.rttMs > 100: evidence.append(f"RTT is elevated at {f.rttMs:.0f} ms")
    if f.gatewayLoad > .8: evidence.append(f"Gateway load is high at {f.gatewayLoad:.1%}")
    if f.websocketFailures: evidence.append(f"{f.websocketFailures} WebSocket failures reported")
    if not evidence: evidence.append("No strong threshold breach; score is a baseline heuristic")
    return evidence[:5]

def feature_vector(f: Features) -> list[float]:
    return [f.packetLoss, f.rttMs, f.jitterMs, f.throughputMbps, f.gatewayLoad]

@app.get("/health")
def health() -> dict[str, str]:
    _, model = load_anomaly_model()
    return {"status": "ok", "mode": model["mode"], "modelVersion": model["modelVersion"]}

@app.get("/models")
@app.get("/api/v1/ml/models")
def models() -> list[dict[str, Any]]:
    return list_models()

@app.post("/api/v1/ml/anomaly")
def anomaly(req: AnomalyRequest) -> dict[str, Any]:
    trained, model = load_anomaly_model()
    if trained is not None:
        raw = float(-trained.decision_function([feature_vector(req.features)])[0])
        score = round(clamp((raw + 0.5) / 1.0), 4)
    else:
        score = anomaly_score(req.features)
    return {"nodeId": req.nodeId, "anomalyScore": score, "isAnomaly": score >= .5,
            "modelVersion": model["modelVersion"], "mode": model["mode"],
            "evidence": evidence_for(req.features)}

@app.post("/v1/anomaly/detect")
@app.post("/api/v1/intelligence/anomalies/analyze")
def anomaly_v1(req: AnomalyRequest) -> dict[str, Any]:
    result = anomaly(req)
    return {
        "predictionId": f"pred-{req.nodeId}-{int(__import__('time').time() * 1000)}-{uuid.uuid4().hex[:8]}",
        "task": "ANOMALY_DETECTION",
        "entityId": req.nodeId,
        "model": {"name": "anomaly-detector", "version": result["modelVersion"]},
        "result": {"anomaly": result["isAnomaly"], "score": result["anomalyScore"]},
        "evidence": [{"reason": item} for item in result["evidence"]],
        "generatedAt": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
        "mode": result["mode"],
    }

@app.post("/api/v1/ml/correlate")
def correlate(req: CorrelateRequest) -> dict[str, Any]:
    f = req.networkState
    network = anomaly_score(f)
    same_location = 1.0 if req.ticket.location and req.ticket.location.lower() in str(req.topology).lower() else .0
    temporal = clamp(1 - req.ticket.timestampMinutesAgo / 15)
    score = round(clamp(.35 * network + .25 * same_location + .20 * temporal + .20 * min(len(req.activeIncidents), 1)), 4)
    return {"incidentId": (str(req.activeIncidents[0].get("id", "INC-HEURISTIC-001")) if req.activeIncidents else "INC-HEURISTIC-001"),
            "score": score, "decision": "ATTACH" if score >= .6 else "SEPARATE",
            "modelVersion": "correlation-fallback-v1", "mode": "heuristic-fallback",
            "evidence": evidence_for(f)}

@app.post("/api/v1/ml/root-cause")
def root_cause(req: RootCauseRequest) -> dict[str, Any]:
    ranked = []
    for c in req.candidates:
        node = str(c.get("nodeId", c.get("node", "unknown")))[:80]
        centrality = float(c.get("centrality", 0) or 0)
        score = clamp(.55 * anomaly_score(req.networkState) + .45 * min(max(centrality, 0), 1))
        ranked.append({"node": node, "probability": round(score, 4)})
    ranked.sort(key=lambda x: x["probability"], reverse=True)
    return {"rootCause": ranked[0]["node"], "probability": ranked[0]["probability"],
            "alternatives": ranked[1:5], "modelVersion": "rootcause-fallback-v1",
            "mode": "heuristic-fallback", "confidence": ranked[0]["probability"],
            "evidence": evidence_for(req.networkState),
            "caveat": "Probable cause only; not a certainty or diagnosis."}

@app.post("/api/v1/ml/impact")
def impact(req: ImpactRequest) -> dict[str, Any]:
    score = clamp(.25 * min(req.affectedUsers / 500, 1) + .15 * min(req.affectedNodes / 20, 1) +
                   .2 * req.serviceCriticality + .15 * min(req.durationMinutes / 120, 1) +
                   .1 * min(req.ticketVelocity / 50, 1) + .15 * req.predictedPropagation)
    label = "LOW" if score < .25 else "MEDIUM" if score < .5 else "HIGH" if score < .75 else "CRITICAL"
    return {"impactScore": round(score, 4), "severity": label, "modelVersion": "impact-fallback-v1",
            "mode": "heuristic-fallback", "operationalOnly": True}

@app.post("/api/v1/ml/propagation")
def propagation(req: PropagationRequest) -> dict[str, Any]:
    predicted = []
    score = anomaly_score(req.networkState)
    for node in req.currentNodes:
        for neighbor in req.neighbors.get(node, [])[:20]:
            if neighbor not in req.currentNodes and neighbor not in predicted and score >= .35:
                predicted.append(neighbor)
    probability = round(clamp(score * .8), 4)
    return {"predictedNodes": predicted[:100], "nodeFailureProbability": probability,
            "modelVersion": "propagation-fallback-v1", "mode": "heuristic-fallback",
            "caveat": "Forecast is a bounded heuristic, not a guarantee."}

@app.post("/api/v1/ml/policy-score")
def policy_score(req: PolicyRequest) -> dict[str, Any]:
    degraded = req.network.packetLoss > .1 or req.network.rttMs > 300 or req.network.jitterMs > 100
    critical = req.messageClass == "CRITICAL_EVENT" or req.severity >= .75
    policy = "CRITICAL_UDP_R4" if critical else "RELIABLE_TCP" if req.messageClass == "RELIABLE" else "LIVE_WEBSOCKET" if req.messageClass == "LIVE" else "HTTPS"
    retries = 4 if critical else 2 if degraded else 0
    estimated = min(req.deadlineMs * 2, max(50, int(req.network.rttMs * (retries + 1) + req.network.jitterMs)))
    expected = clamp((1 - req.network.packetLoss) * req.receiver.historicalSuccess * (1 - .1 * req.network.rttMs / 1000))
    return {"recommendedPolicy": policy, "retries": retries, "expectedDeliveryProbability": round(expected, 4),
            "expectedLatencyMs": estimated, "confidence": round(.65 if degraded else .8, 4),
            "modelVersion": "policy-fallback-v1", "mode": "heuristic-fallback",
            "caveat": "Estimate is not a delivery guarantee; gateway must enforce hard limits."}
