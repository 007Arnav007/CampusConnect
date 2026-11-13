# CampusConnect — Final Implementation Plan
## Patent + Research + CNT + ML Complete Build Specification

**Status:** Final implementation blueprint  
**Baseline:** Current CampusConnect README supplied by the project team  
**Primary objective:** Upgrade CampusConnect into a complete, reproducible CNT + ML research prototype with a defensible technical contribution suitable for patent evaluation and an experimental research paper.

---

# 0. FINAL DECISION — WHAT WE ARE ADDING

Do **not** add many unrelated AI features.

The project will add **two tightly coupled innovations**:

## Innovation A — Network-Aware Incident Correlation Engine

The system combines:

- network telemetry,
- ticket/event telemetry,
- location,
- time,
- campus topology,
- service identity,
- historical incident outcomes,

to determine whether multiple apparently independent reports are manifestations of one underlying network/service incident.

It produces:

- anomaly score,
- incident cluster,
- affected topology nodes,
- estimated affected users,
- probable root cause,
- impact/severity score,
- propagation probability,
- confidence and explanation.

### Core transformation

```text
Individual reports
      +
Network telemetry
      +
Campus topology
      +
Time/location correlation
             |
             v
   Network-Aware Incident Graph
             |
             v
      Parent Incident
             |
     +-------+-------+
     |       |       |
   Ticket  Ticket  Ticket
```

## Innovation B — Incident-Aware Adaptive Communication Policy

The gateway does not use one fixed transport/retry policy for every event.

For an important event, the system considers:

- message criticality,
- predicted incident severity,
- number of affected users,
- network latency,
- packet loss,
- jitter,
- bandwidth,
- receiver health,
- historical delivery success,
- current congestion,
- predicted propagation,
- deadline/time-to-deliver,

and computes a communication policy.

The policy controls:

- transport,
- retry count,
- retry interval,
- redundancy level,
- acknowledgment requirement,
- timeout,
- fallback behavior,
- notification scope.

```text
Network state
      +
Incident state
      +
Message importance
      +
Receiver state
      |
      v
Adaptive Communication Policy
      |
      +--> HTTPS
      +--> WebSocket
      +--> TCP + ACK
      +--> UDP + signed envelope
      +--> controlled redundancy
      +--> fallback
```

### Important patent positioning

The invention should **not** be described as merely:

- an AI chatbot,
- ML ticket classification,
- generic anomaly detection,
- generic transport switching,
- generic retry logic.

The intended technical contribution is the **closed-loop interaction between network-state inference, incident correlation, and incident-aware communication policy**, implemented inside the existing distributed gateway/backend/receiver architecture.

Patentability is not guaranteed. The final claims must be reviewed by a patent professional after a formal prior-art search. The current Indian Patent Act excludes a computer programme per se/algorithm under Section 3(k), while IP India's patent guidance requires novelty, inventive step, industrial applicability and compliance with exclusions. The current CRI guidance emphasizes technical solution/effect for computer-related inventions.

---

# 1. BASELINE — DO NOT THROW AWAY THE CURRENT PROJECT

The current README already establishes:

- React + TypeScript frontend.
- Spring Boot authoritative backend.
- PostgreSQL + Flyway.
- Node.js gateway.
- Socket.IO foundation.
- TCP ticket events.
- UDP emergency dispatch.
- separate emergency receiver.
- knowledge-base assistant.
- optional server-side Gemini.
- JWT authentication.
- role-based student/staff/admin access.

The README also explicitly identifies incomplete areas:

- emergency delivery is currently `SENT_UNCONFIRMED`;
- UDP receiver acknowledgment is not correlated/persistent;
- WebSocket business subscriptions are not authenticated;
- emergency history is not durable;
- TCP ACKs are not correlated;
- no durable event/outbox;
- no complete E2E suite;
- no production observability;
- AI service is currently directly reachable by the browser.

**Do not rewrite working functionality blindly.**

The first implementation phase must preserve the working foundation and close the known gaps before adding the research layer.

---

# 2. FINAL SYSTEM ARCHITECTURE

```text
                         CAMPUSCONNECT CLIENTS
                    React + TypeScript + Browser
                              |
                              | HTTPS / WSS
                              v
                    +----------------------+
                    |   NETWORK GATEWAY    |
                    |----------------------|
                    | API proxy             |
                    | WebSocket manager     |
                    | TCP event transport   |
                    | UDP emergency sender  |
                    | telemetry collector   |
                    | adaptive policy engine|
                    +----------+-----------+
                               |
                 +-------------+--------------+
                 |                            |
                 | HTTP                       | events
                 v                            v
        +------------------+        +----------------------+
        | SPRING BOOT      |        | NETWORK/TELEMETRY    |
        | AUTHORITATIVE    |        | PIPELINE             |
        | BACKEND          |        +----------+-----------+
        |------------------|                   |
        | auth             |                   |
        | users            |                   |
        | tickets          |                   |
        | notifications    |                   |
        | incidents        |                   |
        | topology         |                   |
        | audit            |                   |
        +--------+---------+                   |
                 |                             |
                 v                             v
        +------------------+        +----------------------+
        | PostgreSQL       |        | ML SERVICE           |
        |------------------|        |----------------------|
        | tickets          |        | feature extraction   |
        | telemetry        |        | anomaly detection    |
        | incidents        |        | clustering           |
        | topology         |        | root cause           |
        | policies         |        | impact prediction    |
        | delivery events  |        | propagation          |
        | model metadata   |        | explanations         |
        +------------------+        +----------+-----------+
                                               |
                                               v
                                      +-------------------+
                                      | INCIDENT ENGINE   |
                                      |-------------------|
                                      | correlation graph |
                                      | parent incident   |
                                      | impact score      |
                                      | root cause        |
                                      | propagation       |
                                      +---------+---------+
                                                |
                                                v
                                      +-------------------+
                                      | ADAPTIVE POLICY   |
                                      | ENGINE            |
                                      |-------------------|
                                      | transport        |
                                      | redundancy       |
                                      | timeout          |
                                      | retry            |
                                      | fallback         |
                                      +---------+---------+
                                                |
                          +---------------------+------------------+
                          |                     |                  |
                        HTTPS                 TCP                UDP
                          |                     |                  |
                          |                     v                  v
                          |              ACK receiver       Emergency receiver
                          |                                          |
                          |                                          v
                          |                                  verified envelope
                          |                                          |
                          +------------------+-----------------------+
                                             |
                                             v
                                    DELIVERY OUTCOME
                                             |
                                             v
                                      ML FEEDBACK LOOP
```

---

# 3. SERVICE RESPONSIBILITIES — FINAL

## frontend

Responsibilities:

- student dashboard;
- staff dashboard;
- admin dashboard;
- ticket creation;
- ticket detail;
- notifications;
- assistant;
- network/incident visualization;
- incident details;
- delivery status;
- model explanations;
- topology visualization;
- policy decision explanation.

Must never:

- own authorization;
- contain Gemini secrets;
- directly change ML model state;
- decide emergency delivery success.

---

## backend

Spring Boot remains the **authoritative source of truth**.

Responsibilities:

- authentication;
- authorization;
- users;
- tickets;
- ticket messages;
- notifications;
- topology metadata;
- telemetry metadata;
- incidents;
- incident membership;
- delivery records;
- communication policies;
- audit logs;
- model metadata;
- ML recommendations;
- acceptance/rejection of recommendations.

The backend commits durable state before user-facing live events are published.

---

## gateway

Responsibilities:

- HTTP proxy;
- authenticated WebSocket;
- network telemetry;
- TCP sender;
- UDP sender;
- delivery state machine;
- adaptive communication policy execution;
- receiver ACK correlation;
- transport metrics;
- rate limiting;
- correlation IDs.

The gateway must not become the authoritative database.

---

## ml-service

Python service.

Recommended stack:

- Python 3.11/3.12;
- FastAPI;
- pandas;
- NumPy;
- scikit-learn;
- XGBoost optional;
- SHAP optional;
- NetworkX;
- joblib;
- Pydantic;
- pytest.

Responsibilities:

- feature extraction;
- anomaly detection;
- ticket similarity;
- incident clustering;
- root-cause ranking;
- impact prediction;
- propagation prediction;
- explanation;
- model versioning.

---

## emergency-receiver

Responsibilities:

- receive UDP datagrams;
- validate signed authorization;
- validate sequence/message ID;
- deduplicate;
- persist receipt;
- generate correlated acknowledgment;
- expose receiver health;
- support controlled test scenarios.

No real emergency dispatch should be claimed.

---

## ai-service

Keep the existing knowledge assistant.

Responsibilities:

- approved campus knowledge retrieval;
- optional Gemini generation;
- source references;
- deterministic fallback;
- assistant conversation;
- safe ticket draft.

AI assistant is **not** the patent core.

---

# 4. FINAL DATA FLOW

## 4.1 Ticket creation

```text
Student
  |
  v
Frontend
  |
 HTTPS
  |
  v
Gateway
  |
  v
Spring Boot
  |
  +--> validate JWT
  +--> validate request
  +--> persist ticket
  +--> persist notification
  +--> persist event/outbox
  |
  v
ML feature pipeline
  |
  +--> extract ticket features
  +--> compare with active incidents
  +--> check topology/location/time
  |
  v
Existing incident?
  |
  +---- YES ---> attach as child report
  |
  +---- NO ----> create candidate incident
```

---

# 5. NETWORK TELEMETRY

The ML system needs real data.

Because the educational deployment may not have access to real campus router telemetry, build a **network telemetry simulator** plus an optional real telemetry adapter.

## Telemetry fields

Minimum:

```text
timestamp
source_node
destination_node
service_id
packet_count
packet_loss_rate
rtt_ms
jitter_ms
throughput_mbps
connection_failures
websocket_failures
tcp_ack_latency_ms
udp_ack_latency_ms
active_connections
cpu_percent
memory_percent
gateway_load
receiver_health
```

Optional:

```text
dns_latency
http_error_rate
http_5xx_rate
retransmission_count
queue_depth
bandwidth_utilization
```

---

# 6. NETWORK TOPOLOGY MODEL

Represent the campus as a graph.

Example:

```text
Internet
   |
Core Router
   |
Distribution Switch
   |
+--------+--------+--------+
|        |        |        |
AP-01   AP-02    AP-03   AP-04
|        |        |        |
Lab A   Lab B    Library Hostel
```

Each topology node stores:

```text
node_id
node_type
name
building
floor
room
parent_node_id
subnet
service_group
capacity
status
```

Relations:

```text
CONNECTED_TO
SERVES
LOCATED_IN
DEPENDS_ON
```

Do not require Neo4j initially.

Use PostgreSQL tables + NetworkX in ML service.

Optional future extension: graph database.

---

# 7. TELEMETRY SIMULATOR

Create:

```text
network-simulator/
```

It must generate controlled scenarios.

## Normal scenario

```text
packet_loss: 0.1–1%
rtt: 10–40ms
jitter: 1–8ms
throughput: stable
```

## Congestion

```text
packet_loss increases
rtt increases
jitter increases
throughput decreases
```

## AP failure

```text
one node becomes degraded
tickets increase around the node
affected users increase
```

## Router failure

```text
multiple downstream nodes degrade
```

## Gateway overload

```text
WebSocket failures
HTTP latency
TCP ACK delay
```

## Random noise

Add normal random variation so models cannot simply learn fixed thresholds.

---

# 8. FEATURE ENGINEERING

The ML feature vector must combine three classes.

## Network features

```text
mean_rtt_1m
rtt_std_1m
packet_loss_1m
packet_loss_delta
jitter_1m
throughput_delta
connection_failure_rate
tcp_ack_latency
udp_ack_latency
websocket_failure_rate
gateway_load
receiver_health
```

## Incident features

```text
tickets_5m
tickets_15m
tickets_30m
ticket_velocity
unique_reporters
category_distribution
text_similarity
duplicate_probability
severity_distribution
```

## Topology/spatial features

```text
affected_nodes
affected_users
distance_to_suspected_node
same_building_ratio
same_floor_ratio
same_ap_ratio
downstream_node_count
node_centrality
historical_failure_count
```

## Temporal features

```text
hour
day_of_week
duration
time_since_last_incident
incident_frequency
```

---

# 9. INNOVATION A — INCIDENT CORRELATION ENGINE

This is the first major ML component.

## Pipeline

```text
Ticket
  |
  +--> text embedding/similarity
  |
  +--> category
  |
  +--> location
  |
  +--> timestamp
  |
  +--> affected service
  |
  v
Candidate incidents
  |
  +--> network telemetry
  |
  +--> topology relationship
  |
  +--> time window
  |
  v
Correlation score
  |
  +--> same service
  +--> same location
  +--> same topology region
  +--> temporal proximity
  +--> text similarity
  +--> network anomaly
  |
  v
Parent incident
```

---

# 10. CORRELATION SCORE

Implement an explicit score before ML.

Example:

```text
C =
  0.20 * text_similarity
+ 0.20 * location_similarity
+ 0.20 * topology_similarity
+ 0.15 * temporal_similarity
+ 0.15 * network_anomaly_similarity
+ 0.10 * service_similarity
```

Normalize all values to [0,1].

Then:

```text
C >= 0.80
    strong correlation

0.60 <= C < 0.80
    candidate correlation

C < 0.60
    separate incident
```

These weights must be configurable.

Do not hard-code them into the patent narrative; they are implementation parameters.

---

# 11. ML MODEL FOR INCIDENT CORRELATION

Use a staged approach.

## Version 1

Feature-based model:

- Random Forest;
- XGBoost if available.

Target:

```text
same_incident = 0/1
```

Training examples:

```text
ticket_A, ticket_B, features, label
```

---

## Version 2

Text similarity:

- TF-IDF baseline;
- sentence-transformer embeddings optional.

Do not require a large language model for this.

---

## Version 3

Graph-assisted correlation:

Build:

```text
ticket nodes
network nodes
location nodes
service nodes
time windows
```

Edges represent relationships.

Use NetworkX for graph construction and ranking.

---

# 12. ROOT CAUSE RANKING

For every incident cluster:

```text
Candidate root causes
        |
        v
+------------------------+
| AP-17                  |
| Switch-03              |
| Gateway                |
| Backend                |
| DNS                    |
+------------------------+
        |
        v
Root cause scoring
```

Score using:

```text
root_score =
  network_anomaly
+ topology_centrality
+ temporal_precedence
+ affected_downstream_nodes
+ historical_similarity
+ ticket_correlation
```

Output:

```json
{
  "rootCause": "AP-17",
  "probability": 0.91,
  "alternatives": [
    {"node":"SW-03","probability":0.54},
    {"node":"GW-01","probability":0.17}
  ]
}
```

Never claim root cause as certainty.

Use:

- probable;
- confidence;
- evidence.

---

# 13. INCIDENT IMPACT SCORE

Calculate:

```text
impact =
  affected_users
+ affected_nodes
+ service_criticality
+ incident_duration
+ ticket_velocity
+ predicted_propagation
```

Normalize to [0,1].

Map:

```text
0.00–0.24 LOW
0.25–0.49 MEDIUM
0.50–0.74 HIGH
0.75–1.00 CRITICAL
```

This is an operational score, not a safety certification.

---

# 14. INCIDENT PROPAGATION MODEL

Predict:

```text
current affected nodes
        |
        v
topology graph
        |
        v
historical propagation
        +
current network state
        |
        v
predicted affected nodes
```

Initial model:

Random Forest / XGBoost.

Input:

```text
current node
neighbor count
node centrality
packet loss
rtt
historical propagation
time
service dependency
```

Output:

```text
probability node will become affected within:
5 min
10 min
15 min
```

---

# 15. INNOVATION B — ADAPTIVE COMMUNICATION POLICY

The gateway receives:

```text
message_class
severity
deadline
network_state
incident_state
receiver_state
historical_delivery_stats
```

It evaluates available communication policies.

---

# 16. POLICY CANDIDATES

Define policy profiles.

## P1 — Normal

```text
HTTPS
no extra retry
```

## P2 — Live update

```text
WebSocket
persistent fallback notification
```

## P3 — Reliable event

```text
TCP
application ACK
timeout
retry
idempotency
```

## P4 — High-priority event

```text
TCP
short timeout
limited retry
```

## P5 — Critical emergency test

```text
signed UDP
sequence number
controlled redundancy
receiver ACK
fallback reporting
```

The actual number of retries is determined by policy.

---

# 17. ADAPTIVE POLICY INPUTS

```text
packet_loss
rtt
jitter
bandwidth
receiver_health
incident_severity
affected_users
deadline
historical_success_rate
current_gateway_load
current_transport_success_rate
```

---

# 18. POLICY OUTPUT

Example:

```json
{
  "transport": "UDP",
  "copies": 4,
  "retryIntervalMs": 80,
  "ackRequired": true,
  "ackTimeoutMs": 300,
  "maxAttempts": 4,
  "fallback": "TCP_STATUS",
  "reasonCodes": [
    "CRITICAL_INCIDENT",
    "HIGH_PACKET_LOSS",
    "LOW_UDP_SUCCESS_HISTORY"
  ]
}
```

The decision must be logged.

---

# 19. HOW ML IS USED IN THE POLICY

Do not start with reinforcement learning.

Use a supervised model first.

Training row:

```text
network state
message type
severity
candidate policy
observed result
```

Target:

```text
delivery_success
delivery_latency
retry_count
duplicate_rate
```

Then calculate:

```text
utility =
w1 * delivery_success
- w2 * latency
- w3 * retries
- w4 * duplicates
```

The model estimates the utility of each policy.

The policy engine chooses the highest valid utility subject to hard safety constraints.

---

# 20. HARD SAFETY CONSTRAINTS

ML can recommend.

It cannot override these:

```text
max retries
max packet copies
max payload size
maximum timeout
allowed transports
authentication requirements
signature validation
role authorization
emergency test-only restrictions
```

For example:

```text
if message is emergency:
    require signed authorization
    require message_id
    require sequence_number
    require expiry
    require receiver validation
```

ML cannot disable these checks.

---

# 21. WHY THE COMBINATION MATTERS

The important architecture is:

```text
NETWORK CONDITION
       |
       v
INCIDENT INFERENCE
       |
       v
IMPACT/SEVERITY
       |
       v
COMMUNICATION REQUIREMENT
       |
       v
ADAPTIVE TRANSPORT POLICY
       |
       v
DELIVERY
       |
       v
ACKNOWLEDGMENT
       |
       v
OBSERVED OUTCOME
       |
       +----------> MODEL FEEDBACK
```

This should be the project's central technical story.

---

# 22. EMERGENCY/CRITICAL MESSAGE PROTOCOL

The existing UDP emergency flow must be upgraded for the research prototype.

## Envelope

```json
{
  "messageId": "UUID",
  "sequence": 42,
  "issuedAt": "UTC timestamp",
  "expiresAt": "UTC timestamp",
  "incidentId": "INC-...",
  "priority": "CRITICAL",
  "policyVersion": "P-...",
  "nonce": "...",
  "payloadHash": "...",
  "authorization": "...",
  "signature": "..."
}
```

Do not put unnecessary personal data in the datagram.

---

# 23. RECEIVER STATE MACHINE

```text
RECEIVED
   |
   +--> INVALID_SIGNATURE --> REJECTED
   |
   +--> EXPIRED -----------> REJECTED
   |
   +--> DUPLICATE ---------> DUPLICATE_ACK
   |
   +--> VALID
          |
          v
      PERSISTED
          |
          v
     ACK_GENERATED
```

ACK:

```json
{
  "messageId": "...",
  "sequence": 42,
  "status": "RECEIVED",
  "receiverId": "ER-01",
  "timestamp": "UTC"
}
```

---

# 24. DELIVERY STATE MACHINE

```text
CREATED
  |
  v
POLICY_SELECTED
  |
  v
DISPATCHING
  |
  +--> ACKED ----------------> DELIVERED_CONFIRMED
  |
  +--> TIMEOUT
          |
          +--> RETRY
          |
          +--> FALLBACK
          |
          +--> FAILED
```

Never report:

```text
UDP send() succeeded = delivered
```

The README correctly distinguishes local send completion from receiver delivery. Preserve this rule.

---

# 25. TCP EVENT RELIABILITY

Fix the existing TCP limitation.

Every event must have:

```text
eventId
eventType
createdAt
attempt
payload
```

Pending map:

```text
eventId -> pending delivery record
```

ACK must contain:

```text
eventId
status
receiverId
timestamp
```

Gateway:

```text
send event
start timeout
wait ACK(eventId)

if ACK:
    mark acknowledged

if timeout:
    retry if policy allows

if retry limit:
    mark failed
```

---

# 26. OUTBOX PATTERN

Add a durable backend outbox.

When ticket creation succeeds:

```text
DB transaction
  |
  +--> ticket
  +--> notification
  +--> outbox_event
```

A worker publishes the outbox event to the gateway.

This prevents:

```text
DB commit succeeded
but
event was lost
```

---

# 27. DATABASE CHANGES

Add Flyway migrations.

## `network_nodes`

```text
id
node_id
name
type
building
floor
room
parent_node_id
service_group
capacity
status
created_at
updated_at
```

## `network_links`

```text
id
source_node_id
target_node_id
link_type
capacity
status
```

## `network_telemetry`

```text
id
timestamp
node_id
rtt_ms
jitter_ms
packet_loss
throughput_mbps
active_connections
tcp_ack_latency_ms
udp_ack_latency_ms
websocket_failure_rate
gateway_load
receiver_health
```

Partition/retention may be added later.

## `incident`

```text
id
incident_number
status
category
severity
impact_score
root_cause_node_id
root_cause_confidence
propagation_probability
started_at
detected_at
resolved_at
created_at
updated_at
```

## `incident_tickets`

```text
incident_id
ticket_id
correlation_score
membership_reason
created_at
```

## `incident_predictions`

```text
id
incident_id
model_version
predicted_severity
predicted_root_cause
root_cause_confidence
predicted_propagation
predicted_affected_users
features_hash
created_at
```

## `communication_policies`

```text
id
policy_version
message_class
transport
max_attempts
copies
timeout_ms
retry_interval_ms
ack_required
fallback_transport
created_at
```

## `delivery_events`

```text
id
message_id
event_type
transport
policy_version
attempt
sent_at
ack_at
status
latency_ms
receiver_id
error_code
```

## `model_versions`

```text
id
model_name
version
algorithm
training_dataset_version
metrics_json
artifact_uri
created_at
active
```

## `audit_events`

```text
id
actor_id
action
resource_type
resource_id
metadata_json
created_at
```

---

# 28. ML DATASET FORMAT

Create:

```text
ml-service/data/
```

Dataset files:

```text
network_telemetry.csv
tickets.csv
incident_pairs.csv
incident_outcomes.csv
delivery_events.csv
```

Example:

```csv
timestamp,node_id,rtt_ms,jitter_ms,packet_loss,throughput,tickets_5m,affected_users,incident_label
...
```

---

# 29. SYNTHETIC DATA GENERATION

The simulator must generate labeled ground truth.

Each scenario must know:

```text
true_root_cause
true_start_time
true_affected_nodes
true_incident_id
true_severity
```

This is essential for evaluation.

Without ground truth, do not claim ML accuracy.

---

# 30. MODEL TRAINING PIPELINE

Create:

```text
ml-service/
  src/
    features/
    models/
    training/
    inference/
    evaluation/
```

Commands:

```powershell
python -m src.training.train_anomaly
python -m src.training.train_correlation
python -m src.training.train_rootcause
python -m src.training.train_impact
python -m src.training.train_propagation
python -m src.training.evaluate
```

Artifacts:

```text
models/
  anomaly_v1.joblib
  correlation_v1.joblib
  rootcause_v1.joblib
  impact_v1.joblib
  propagation_v1.joblib
```

Never commit large generated models blindly. Use a documented artifact path and checksums.

---

# 31. MODEL STRATEGY

## Model A — anomaly

Start:

```text
Isolation Forest
```

Output:

```text
anomaly_score
```

---

## Model B — incident correlation

Start:

```text
Random Forest
```

Input:

```text
text similarity
location
topology
time
network similarity
service
```

Output:

```text
same_incident_probability
```

---

## Model C — root cause

Start:

```text
Random Forest / XGBoost
```

Output:

```text
ranked root cause candidates
```

---

## Model D — impact

Start:

```text
Random Forest / Gradient Boosting
```

Output:

```text
affected_users
severity
```

---

## Model E — propagation

Start:

```text
Gradient Boosting
```

Output:

```text
node_failure_probability
```

---

# 32. EXPLAINABILITY

Every prediction must provide:

```json
{
  "modelVersion": "rootcause-v1",
  "prediction": "AP-17",
  "confidence": 0.91,
  "evidence": [
    "Packet loss increased 6.2x",
    "14 reports originated from AP-17 coverage area",
    "Neighboring nodes remain healthy",
    "Historical similarity score: 0.87"
  ]
}
```

For tree models, optionally provide SHAP values.

Do not display raw model internals to normal students.

---

# 33. ML API

Base:

```text
/api/v1/ml
```

## POST `/anomaly`

Input:

```json
{
  "nodeId": "AP-17",
  "features": {}
}
```

Output:

```json
{
  "anomalyScore": 0.91,
  "isAnomaly": true,
  "modelVersion": "anomaly-v1"
}
```

## POST `/correlate`

Input:

```json
{
  "ticket": {},
  "activeIncidents": [],
  "networkState": {},
  "topology": {}
}
```

Output:

```json
{
  "incidentId": "INC-102",
  "score": 0.89,
  "decision": "ATTACH"
}
```

## POST `/root-cause`

## POST `/impact`

## POST `/propagation`

## POST `/policy-score`

Each endpoint must validate payload size and schema.

---

# 34. POLICY API

Gateway should call:

```text
POST /api/v1/ml/policy-score
```

Input:

```json
{
  "messageClass": "CRITICAL_EVENT",
  "severity": 0.92,
  "deadlineMs": 1000,
  "network": {
    "packetLoss": 0.18,
    "rttMs": 140,
    "jitterMs": 42
  },
  "receiver": {
    "healthy": true,
    "historicalSuccess": 0.94
  }
}
```

Output:

```json
{
  "recommendedPolicy": "CRITICAL_UDP_R4",
  "expectedDeliveryProbability": 0.992,
  "expectedLatencyMs": 260,
  "confidence": 0.88
}
```

Gateway validates the result against hard policy constraints.

---

# 35. ADAPTIVE POLICY FALLBACK

If ML service is unavailable:

```text
ML unavailable
     |
     v
deterministic policy table
```

Example:

```text
normal -> HTTPS
live -> WebSocket
reliable -> TCP
critical test -> signed UDP + configured safe retry
```

The application must never fail merely because ML is offline.

---

# 36. FRONTEND — STUDENT

Add:

## Ticket page

Show:

```text
Ticket
Status
Related incident
Estimated impact
Latest update
```

If correlated:

```text
This ticket is linked to Incident INC-1042.
Other reports: 18
Affected area: Library Floor 2
```

Do not expose unnecessary internal network information to students.

---

# 37. FRONTEND — STAFF

New:

## Incident Operations Dashboard

Cards:

```text
Active incidents
Predicted incidents
Affected users
Network anomalies
Unacknowledged events
```

Incident table:

```text
Incident
Severity
Location
Affected users
Root cause probability
Propagation risk
Status
```

---

# 38. FRONTEND — INCIDENT DETAIL

Show:

```text
INC-1042

Severity: HIGH
Confidence: 91%

Probable root cause:
AP-17

Affected:
43 users
3 network nodes

Propagation:
67% in next 10 min

Evidence:
- packet loss spike
- ticket cluster
- topology correlation
```

---

# 39. FRONTEND — NETWORK MAP

Use a simple graph.

Nodes:

```text
Core
Switch
AP
Service
```

States:

```text
healthy
degraded
critical
unknown
```

Clicking a node shows:

```text
current metrics
active incidents
historical incidents
prediction
```

This is for demonstration and research.

---

# 40. FRONTEND — COMMUNICATION DECISION

Staff/admin can see:

```text
Adaptive Communication

Incident severity: 0.92
Packet loss: 18%
Receiver health: GOOD

Selected policy:
CRITICAL_UDP_R4

Copies: 4
ACK timeout: 300ms
Fallback: TCP status

Reason:
High severity + elevated loss + receiver healthy
```

Do not allow normal students to modify this.

---

# 41. FRONTEND — DELIVERY TIMELINE

Show:

```text
09:21:10 Created
09:21:10 Policy selected
09:21:10 UDP attempt 1
09:21:10 UDP attempt 2
09:21:10 UDP attempt 3
09:21:11 Receiver ACK
09:21:11 Confirmed
```

This becomes excellent evidence for the CNT demonstration.

---

# 42. WEBSOCKET HARDENING

Replace the current open socket foundation.

Handshake must contain:

```text
JWT
```

Server validates:

- signature;
- expiry;
- user ID;
- role.

Subscription examples:

```text
ticket:{ticketId}
incident:{incidentId}
user:{userId}
operations
```

Authorization:

```text
student -> own ticket/user channels
staff -> assigned/authorized operations
admin -> operations
```

Never broadcast private events globally.

---

# 43. NOTIFICATION RECOVERY

Persist notification before WebSocket publish.

Client stores:

```text
lastReceivedNotificationId
```

On reconnect:

```text
GET notifications?after=<cursor>
```

Then:

```text
REST recovery
+
WebSocket live events
```

This follows the existing architecture principle.

---

# 44. SECURITY

Required:

- BCrypt;
- JWT;
- role checks;
- backend authorization;
- gateway authorization;
- AI authentication;
- rate limiting;
- payload limits;
- CORS;
- secure secrets;
- no Gemini key in Vite;
- audit logging;
- signed critical envelopes;
- replay protection;
- expiry;
- nonce;
- sequence number;
- idempotency.

---

# 45. ML SECURITY

Protect against:

- malicious ticket text;
- oversized input;
- model abuse;
- feature poisoning;
- unauthorized model update;
- unauthorized policy change.

Only authorized administrators can:

```text
activate model
change policy
change thresholds
```

All changes must be audited.

---

# 46. AI SERVICE

Keep Gemini but make the architecture:

```text
Frontend
   |
Gateway
   |
AI service
   |
Knowledge base
   |
optional Gemini
```

The browser should not directly call the AI service in the final architecture.

AI output remains advisory.

---

# 47. AI + ML SEPARATION

This distinction must be explicit in documentation.

### AI assistant

Handles:

- natural-language questions;
- knowledge retrieval;
- explanations;
- ticket drafting.

### ML incident engine

Handles:

- numerical telemetry;
- anomaly detection;
- correlation;
- prediction;
- policy scoring.

### Rule engine

Handles:

- authorization;
- hard safety limits;
- transport constraints;
- cryptographic validation.

This three-layer separation is important.

---

# 48. OBSERVABILITY

Add correlation IDs:

```text
X-Correlation-ID
```

Every request/event gets one.

Structured logs:

```json
{
  "timestamp": "...",
  "service": "gateway",
  "event": "delivery_ack",
  "messageId": "...",
  "policy": "...",
  "latencyMs": 212
}
```

Never log:

- passwords;
- JWT secrets;
- Gemini keys;
- full sensitive ticket bodies;
- unnecessary personal information.

---

# 49. METRICS

Expose:

```text
http_requests_total
http_request_latency
tcp_events_sent
tcp_ack_success
tcp_ack_timeout
udp_attempts
udp_ack_success
udp_ack_timeout
websocket_connections
websocket_reconnects
ml_predictions
ml_latency
incident_clusters
duplicate_tickets
```

Research metrics:

```text
mean_time_to_detect
mean_time_to_ack
mean_time_to_resolve
duplicate_reduction
prediction_precision
prediction_recall
transport_delivery_rate
transport_latency
retry_count
```

---

# 50. TESTING — UNIT

Backend:

- authentication;
- authorization;
- ticket creation;
- ticket ownership;
- incident membership;
- notification persistence;
- outbox;
- policy validation.

Gateway:

- TCP framing;
- ACK correlation;
- timeout;
- retry;
- UDP envelope;
- policy execution;
- rate limit.

ML:

- feature extraction;
- model loading;
- schema validation;
- prediction ranges;
- fallback.

Receiver:

- signature;
- expiry;
- sequence;
- duplicate;
- ACK.

Frontend:

- route protection;
- API error states;
- incident rendering;
- delivery timeline.

---

# 51. TESTING — INTEGRATION

Test:

```text
Frontend
 -> Gateway
 -> Backend
 -> PostgreSQL
```

and:

```text
Gateway
 -> TCP receiver
 -> ACK
```

and:

```text
Gateway
 -> UDP receiver
 -> verification
 -> persistence
 -> ACK
 -> Gateway
```

and:

```text
Ticket
 -> ML correlation
 -> incident
 -> policy
 -> notification
```

---

# 52. TESTING — FAILURE INJECTION

Must simulate:

## Network

- 1% packet loss
- 5%
- 10%
- 20%

## Latency

- 20ms
- 100ms
- 250ms
- 500ms

## Receiver

- healthy
- delayed
- unavailable
- restarted

## Gateway

- overloaded
- restarted

## ML

- unavailable
- timeout
- malformed response

Expected behavior must be deterministic and documented.

---

# 53. DUPLICATE/IDEMPOTENCY TESTS

Send the same message twice.

Expected:

```text
first -> persisted
second -> duplicate
```

Never create two incident records from the same event.

Never count duplicate delivery as two successful logical deliveries.

---

# 54. MODEL EVALUATION

Do not use only accuracy.

## Anomaly detection

- precision;
- recall;
- F1;
- false positive rate;
- detection lead time.

## Correlation

- precision;
- recall;
- F1;
- duplicate-ticket reduction.

## Root cause

- Top-1 accuracy;
- Top-3 accuracy;
- MRR.

## Impact

- MAE;
- RMSE;
- classification F1.

## Propagation

- precision;
- recall;
- Brier score if probabilistic.

---

# 55. NETWORK EVALUATION

Compare:

## Baseline A

Fixed transport.

## Baseline B

Fixed retries.

## Proposed

Adaptive policy.

Measure:

```text
delivery success
delivery latency
retries
duplicates
bandwidth overhead
```

Run at:

```text
loss = 0%
loss = 5%
loss = 10%
loss = 20%
```

and multiple RTT values.

---

# 56. ABLATION STUDY

This is critical for publication.

Compare:

```text
A. network telemetry only

B. network + ticket correlation

C. network + ticket + topology

D. network + ticket + topology + adaptive policy
```

This demonstrates which component actually provides value.

---

# 57. RESEARCH HYPOTHESES

H1:

> Combining network telemetry with ticket/location/topology information improves incident correlation compared with ticket-only classification.

H2:

> Network-aware incident correlation reduces duplicate incident records.

H3:

> Adaptive communication policies improve delivery success under degraded network conditions compared with fixed retry policies.

H4:

> Incident-aware policy selection reduces delivery latency or communication overhead while maintaining required delivery reliability.

H5:

> Closed-loop delivery/resolution outcomes improve subsequent model performance.

---

# 58. EXPERIMENT MATRIX

Create at least:

```text
5 network conditions
x
4 incident severities
x
3 policy strategies
x
30 repetitions
```

Record raw results.

Use confidence intervals.

Do not fabricate results.

---

# 59. BASELINES

The paper must compare against:

1. ticket-only correlation;
2. fixed threshold anomaly detection;
3. static transport policy;
4. fixed retry policy;
5. proposed system.

If external benchmark datasets are used, document exact source, license, preprocessing and split.

---

# 60. TRAIN/TEST SPLIT

Never randomly leak adjacent time samples.

Prefer:

```text
Training:
earlier scenarios/dates

Validation:
later scenarios

Test:
completely held-out scenarios
```

For synthetic experiments:

```text
scenario seed 1–70 -> train
71–85 -> validation
86–100 -> test
```

Keep test seeds hidden during model tuning.

---

# 61. REPRODUCIBILITY

Create:

```text
experiments/
  configs/
  seeds/
  results/
  plots/
  tables/
```

Every experiment stores:

```text
timestamp
git commit
model version
dataset version
seed
configuration
metrics
```

---

# 62. MODEL VERSIONING

Never overwrite:

```text
anomaly-v1
```

with new training.

Use:

```text
anomaly-v1
anomaly-v2
```

Store:

```text
algorithm
features
dataset
training date
metrics
checksum
```

---

# 63. PATENT EVIDENCE MODE

Add an internal demonstration mode.

It should display:

```text
Input network state
Input incident state
ML output
Policy selected
Transport used
ACK result
Outcome
```

This allows the inventors to reproduce the technical mechanism during evaluation.

Do not expose sensitive implementation secrets publicly.

---

# 64. PATENT FIGURES TO PREPARE

Create at least these figures:

### Figure 1
Overall architecture.

### Figure 2
Network-aware incident correlation flow.

### Figure 3
Incident graph.

### Figure 4
Adaptive communication policy.

### Figure 5
Critical message state machine.

### Figure 6
ML feedback loop.

### Figure 7
Campus topology dashboard.

### Figure 8
Experimental setup.

### Figure 9
Baseline vs proposed communication performance.

### Figure 10
Incident detection/correlation results.

---

# 65. PATENT CLAIM DIRECTION

Do not write final legal claims without counsel.

Technical claim concept:

> A computer-implemented distributed communication system comprising a network gateway, authoritative backend, persistent storage, network telemetry collector, incident inference engine, and adaptive communication controller, wherein the incident inference engine derives an incident state from network telemetry and correlated user reports associated with topology and temporal information, and wherein the adaptive communication controller selects a communication policy based on the incident state and measured network state, the policy defining at least a transport, delivery confirmation mechanism, retry/redundancy behavior and fallback, with delivery outcomes stored and fed back to subsequent policy inference.

Potential dependent concepts:

- topology-aware correlation;
- propagation prediction;
- receiver health;
- historical delivery performance;
- signed critical message envelope;
- sequence number;
- idempotency;
- correlated acknowledgment;
- adaptive redundancy;
- ML model confidence;
- deterministic fallback;
- human authorization for policy override.

These are **claim concepts for patent counsel**, not legal claims.

---

# 66. DO NOT OVERCLAIM

Avoid claiming:

- "first ever";
- "100% reliable";
- "guaranteed emergency delivery";
- "AI solves network failures";
- "patent guaranteed";
- "real emergency system."

Use:

- prototype;
- controlled experiment;
- measured reliability;
- predicted probability;
- receiver-confirmed;
- test environment.

---

# 67. PATENT PRIOR-ART STRATEGY

Before filing:

Search at minimum:

```text
network incident correlation machine learning
network anomaly root cause topology
adaptive transport selection machine learning
adaptive retry network machine learning
incident-aware communication policy
network telemetry ticket correlation
predictive network incident management
adaptive UDP redundancy acknowledgment
```

Also search:

- Google Patents;
- WIPO PATENTSCOPE;
- Espacenet;
- IEEE Xplore;
- ACM Digital Library.

The prior-art search must be repeated after implementation because exact feature combinations may already exist.

---

# 68. IMPORTANT PRIOR-ART WARNING

There is already prior art around:

- topology/event correlation and ML root-cause detection;
- dynamically adaptive transport protocols;
- ML-based adaptive transport selection.

Therefore the project must not present those generic ideas as the invention.

The defensible direction is the **specific integrated architecture and interaction between incident inference and communication-policy adaptation**, with measurable technical effects.

A patent professional should determine whether that combination is sufficiently novel/non-obvious.

---

# 69. PUBLICATION PAPER STRUCTURE

## Title

Recommended:

**CampusConnect: A Network-Aware Machine Learning Framework for Predictive Incident Correlation and Adaptive Communication in Distributed Campus Networks**

## Sections

1. Abstract
2. Introduction
3. Problem Statement
4. Related Work
5. Existing CampusConnect Architecture
6. Proposed Architecture
7. Network-Aware Incident Correlation
8. Adaptive Communication Policy
9. ML Models
10. Security and Reliability
11. Experimental Setup
12. Results
13. Ablation Study
14. Discussion
15. Limitations
16. Conclusion
17. Future Work
18. References

---

# 70. PAPER CONTRIBUTIONS

Claim only what experiments demonstrate.

Potential contribution statements:

1. A service-oriented architecture combining campus issue management with network telemetry.
2. A topology/time/location-aware incident correlation method.
3. An incident-aware communication policy that adapts transport/redundancy parameters to network and incident state.
4. A closed-loop evaluation mechanism connecting communication outcomes to later decisions.
5. An experimental evaluation under controlled network degradation.

---

# 71. DEMO SCENARIO

The final demonstration should be deterministic.

## Scenario

Simulate:

```text
AP-17 degradation
```

Network:

```text
packet loss -> 18%
RTT -> 140ms
jitter -> 42ms
```

Students generate:

```text
20 Wi-Fi tickets
```

System detects:

```text
anomaly = 0.94
```

Correlation:

```text
20 tickets -> 1 parent incident
```

Root cause:

```text
AP-17
confidence = 0.91
```

Impact:

```text
affected users = 43
severity = HIGH
```

Propagation:

```text
67% chance neighboring AP cluster degrades
```

Then send a controlled critical event.

Policy chooses:

```text
UDP
copies = 4
ACK required
fallback = TCP status
```

Receiver:

```text
valid signature
valid sequence
persist
ACK
```

Gateway:

```text
DELIVERED_CONFIRMED
```

Then simulate receiver failure.

System:

```text
timeout
retry
fallback
FAILED/DEGRADED status
```

Dashboard shows the full timeline.

This single demo proves:

- CNT;
- ML;
- distributed architecture;
- transport behavior;
- acknowledgment;
- reliability;
- incident correlation.

---

# 72. REPOSITORY CHANGES

Final target structure:

```text
final/
├── frontend/
├── backend/
├── gateway/
├── ai-service/
├── emergency-receiver/
├── ml-service/
├── network-simulator/
├── knowledge-base/
├── docs/
│   ├── architecture/
│   ├── networking/
│   ├── ml/
│   ├── experiments/
│   ├── patent/
│   └── development/
├── experiments/
├── scripts/
├── docker-compose.yml
├── .env.example
├── README.md
├── IMPLEMENTATION_PLAN.md
└── PATENT_RESEARCH_NOTES.md
```

---

# 73. ML-SERVICE STRUCTURE

```text
ml-service/
├── src/
│   ├── main.py
│   ├── config.py
│   ├── api/
│   │   ├── anomaly.py
│   │   ├── correlation.py
│   │   ├── rootcause.py
│   │   ├── impact.py
│   │   ├── propagation.py
│   │   └── policy.py
│   ├── features/
│   ├── models/
│   ├── training/
│   ├── inference/
│   ├── graph/
│   ├── evaluation/
│   └── utils/
├── data/
├── models/
├── tests/
├── requirements.txt
├── Dockerfile
└── README.md
```

---

# 74. NETWORK SIMULATOR STRUCTURE

```text
network-simulator/
├── src/
│   ├── simulator.ts
│   ├── scenarios/
│   │   ├── normal.ts
│   │   ├── congestion.ts
│   │   ├── apFailure.ts
│   │   ├── routerFailure.ts
│   │   └── gatewayOverload.ts
│   ├── topology.ts
│   ├── telemetry.ts
│   └── ticketGenerator.ts
├── scenarios/
├── tests/
├── package.json
└── README.md
```

---

# 75. BACKEND MODULES

Add packages:

```text
incident/
telemetry/
topology/
delivery/
policy/
outbox/
audit/
ml/
```

Recommended entities:

```text
Incident
IncidentTicket
NetworkNode
NetworkLink
NetworkTelemetry
IncidentPrediction
CommunicationPolicy
DeliveryEvent
ModelVersion
AuditEvent
OutboxEvent
```

---

# 76. GATEWAY MODULES

Add:

```text
telemetry.ts
adaptive-policy.ts
delivery-state.ts
tcp-ack.ts
udp-envelope.ts
outbox-consumer.ts
ws-auth.ts
correlation-id.ts
```

---

# 77. FRONTEND MODULES

Add:

```text
pages/
  incidents/
  network/
  operations/

components/
  IncidentCard
  IncidentTimeline
  NetworkGraph
  PredictionPanel
  PolicyDecision
  DeliveryTimeline
  SeverityBadge
  ConfidenceBadge
```

---

# 78. ENVIRONMENT VARIABLES

Add:

```text
ML_SERVICE_URL=http://localhost:5100

ML_REQUEST_TIMEOUT_MS=1500

ML_ENABLED=true

TELEMETRY_INTERVAL_MS=5000

INCIDENT_CORRELATION_WINDOW_MINUTES=15

INCIDENT_CORRELATION_THRESHOLD=0.80

POLICY_MODE=adaptive

POLICY_FALLBACK_MODE=deterministic

MAX_UDP_COPIES=5

MAX_CRITICAL_RETRIES=5

TCP_ACK_TIMEOUT_MS=500

UDP_ACK_TIMEOUT_MS=300

OUTBOX_POLL_INTERVAL_MS=500

NETWORK_SIMULATOR_ENABLED=true
```

Never expose secrets through `VITE_*`.

---

# 79. DOCKER COMPOSE

Add services:

```text
postgres
backend
gateway
ai-service
ml-service
emergency-receiver
network-simulator
frontend
```

For the first development milestone, it is acceptable to keep only PostgreSQL containerized and run application services locally.

For final reproducibility, provide a full Compose profile.

---

# 80. IMPLEMENTATION ORDER

Do NOT implement everything simultaneously.

## Phase 0 — Freeze and verify

- tag current working baseline;
- build every service;
- run tests;
- record current behavior;
- backup database;
- document known failures.

Exit:

```text
BASELINE_VERIFIED
```

---

## Phase 1 — Reliability foundation

Implement:

- durable outbox;
- TCP ACK correlation;
- delivery state;
- emergency records;
- receiver ACK;
- idempotency;
- WebSocket authentication.

Exit:

```text
NETWORK_FOUNDATION_COMPLETE
```

---

## Phase 2 — Telemetry

Implement:

- telemetry schema;
- network simulator;
- telemetry ingestion;
- topology schema;
- topology API.

Exit:

```text
TELEMETRY_COMPLETE
```

---

## Phase 3 — ML anomaly engine

Implement:

- dataset generator;
- feature extraction;
- Isolation Forest;
- evaluation;
- ML API;
- backend integration.

Exit:

```text
ANOMALY_ENGINE_COMPLETE
```

---

## Phase 4 — Incident correlation

Implement:

- ticket feature extraction;
- topology graph;
- correlation model;
- incident creation;
- parent-child tickets;
- root cause;
- impact;
- propagation.

Exit:

```text
INCIDENT_ENGINE_COMPLETE
```

---

## Phase 5 — Adaptive communication

Implement:

- policy candidates;
- policy scoring;
- ML policy model;
- hard constraints;
- deterministic fallback;
- gateway integration;
- delivery telemetry.

Exit:

```text
ADAPTIVE_POLICY_COMPLETE
```

---

## Phase 6 — UI

Implement:

- operations dashboard;
- incident dashboard;
- network map;
- prediction panels;
- policy explanation;
- delivery timeline.

Exit:

```text
OPERATIONS_UI_COMPLETE
```

---

## Phase 7 — AI integration

Move AI behind gateway.

Implement:

- authenticated AI API;
- source grounding;
- assistant-to-ticket draft;
- safe fallback.

Exit:

```text
AI_INTEGRATION_COMPLETE
```

---

## Phase 8 — Testing

Implement:

- unit tests;
- integration tests;
- E2E tests;
- failure injection;
- ML evaluation;
- network experiments.

Exit:

```text
SYSTEM_VALIDATED
```

---

## Phase 9 — Research experiments

Run:

- baseline;
- proposed;
- ablation;
- failure conditions;
- repeated seeds.

Export:

```text
CSV
JSON
PNG
tables
```

Exit:

```text
RESULTS_REPRODUCIBLE
```

---

## Phase 10 — Patent package

Prepare:

- invention disclosure;
- technical problem;
- architecture;
- flowcharts;
- embodiments;
- experimental evidence;
- prior-art matrix;
- proposed claim concepts.

Exit:

```text
PATENT_DOSSIER_READY_FOR_COUNSEL
```

---

## Phase 11 — Publication package

Prepare:

- paper;
- figures;
- tables;
- dataset description;
- reproducibility package;
- limitations;
- references.

Exit:

```text
PAPER_READY
```

---

# 81. DEFINITION OF DONE

The project is NOT complete merely because:

```text
npm run build
```

passes.

A feature is complete only if:

- API exists;
- persistence exists;
- authorization exists;
- UI exists where required;
- error state exists;
- recovery exists;
- logs exist;
- tests exist;
- documentation exists;
- experimental evidence exists if it is a research claim.

---

# 82. FINAL ACCEPTANCE TESTS

## AT-01

Student creates ticket.

Expected:

- persisted;
- notification persisted;
- outbox created;
- event delivered;
- ACK correlated.

## AT-02

20 correlated tickets.

Expected:

- one parent incident;
- child memberships;
- correlation scores.

## AT-03

Network anomaly.

Expected:

- anomaly detected;
- incident candidate generated.

## AT-04

Root cause scenario.

Expected:

- correct root cause in top-3;
- evidence displayed.

## AT-05

Propagation.

Expected:

- predicted affected nodes;
- probability returned.

## AT-06

Adaptive policy.

Expected:

- policy changes with network state.

## AT-07

UDP receiver healthy.

Expected:

```text
DELIVERED_CONFIRMED
```

only after correlated ACK.

## AT-08

UDP receiver unavailable.

Expected:

```text
TIMEOUT -> RETRY -> FALLBACK/FAILED
```

never false success.

## AT-09

Duplicate message.

Expected:

```text
DUPLICATE
```

and no second logical incident.

## AT-10

WebSocket disconnect.

Expected:

```text
reconnect
+
REST recovery
```

## AT-11

ML service unavailable.

Expected:

```text
deterministic fallback
```

## AT-12

Unauthorized student requests admin incident data.

Expected:

```text
403
```

## AT-13

ML recommendation conflicts with hard security policy.

Expected:

```text
recommendation rejected
```

## AT-14

Restart receiver.

Expected:

- durable records preserved;
- duplicate detection preserved according to configured persistence.

## AT-15

Restart gateway.

Expected:

- database state remains;
- pending delivery state recoverable where designed.

---

# 83. REQUIRED DOCUMENTATION

Create:

```text
docs/ml/architecture.md
docs/ml/features.md
docs/ml/training.md
docs/ml/evaluation.md
docs/networking/adaptive-policy.md
docs/networking/delivery-state-machine.md
docs/networking/telemetry.md
docs/experiments/protocol.md
docs/experiments/results.md
docs/patent/invention-disclosure.md
docs/patent/claim-concepts.md
docs/patent/prior-art-matrix.md
docs/patent/figures.md
docs/development/ml-setup.md
```

---

# 84. PATENT DISCLOSURE CONTENT

Document:

## Problem

Existing campus support systems treat tickets and communication independently and generally do not use network state and incident state together to determine communication behavior.

## Existing limitation

A fixed transport policy cannot account for rapidly changing network conditions and incident importance.

## Proposed technical solution

A network-aware incident engine derives a structured incident state from network telemetry, topology, spatial-temporal ticket correlations and historical outcomes, and an adaptive communication controller uses that state together with measured transport performance to select a bounded communication policy.

## Technical effects to measure

- improved delivery probability;
- reduced delivery latency;
- reduced unnecessary retransmissions;
- reduced duplicate incident records;
- earlier detection;
- improved root-cause ranking;
- improved recovery time.

Only include effects actually demonstrated by experiments.

---

# 85. PUBLIC DISCLOSURE RULE

Before patent filing/priority establishment:

Do not publicly publish:

- full source code;
- detailed algorithm;
- exact claim concepts;
- novel architecture diagrams;
- benchmark results;
- conference paper;
- public GitHub repository containing the invention.

Coordinate the patent filing/priority date with the inventors and patent professional.

---

# 86. RESEARCH ARTIFACTS

Final repository should contain:

```text
artifacts/
  datasets/
  model-metrics/
  experiment-results/
  figures/
  tables/
```

Use Git LFS or an external research repository for large model/data artifacts if necessary.

---

# 87. FINAL DEMO SCRIPT

1. Login as admin.
2. Open operations dashboard.
3. Start network simulator in NORMAL mode.
4. Show healthy topology.
5. Inject AP-17 degradation.
6. Show telemetry change.
7. Show anomaly score.
8. Generate correlated tickets.
9. Show parent incident.
10. Show root-cause prediction.
11. Show affected users.
12. Show propagation prediction.
13. Trigger controlled critical test event.
14. Show adaptive policy.
15. Show UDP attempts.
16. Show receiver verification.
17. Show TCP acknowledgment.
18. Show confirmed delivery.
19. Disable receiver.
20. Repeat.
21. Show timeout/retry/fallback.
22. Restore receiver.
23. Show recovery.
24. Open incident history.
25. Show model version and evidence.
26. Show experiment metrics.

This should be the final viva/patent demonstration.

---

# 88. FINAL PROJECT NAME

Recommended technical title:

**CampusConnect: A Network-Aware Machine Learning Framework for Predictive Incident Correlation and Adaptive Communication in Distributed Campus Networks**

Short product name:

**CampusConnect**

Patent working title:

**Network-Aware Predictive Incident Correlation and Adaptive Communication System for Distributed Institutional Networks**

---

# 89. FINAL ONE-LINE INVENTION

> A distributed network communication system that correlates network telemetry with spatial-temporal incident reports and network topology to infer an incident state, and dynamically selects a bounded transport, acknowledgment, retry, redundancy and fallback policy based on the inferred incident state and measured network conditions, while recording communication outcomes for subsequent decision improvement.

---

# 90. FINAL SUCCESS CONDITION

CampusConnect is considered research/patent-ready only when ALL of these are true:

```text
[ ] Existing application works
[ ] Backend authorization verified
[ ] Durable ticket workflow works
[ ] TCP ACK correlation works
[ ] Emergency records are durable
[ ] UDP receiver verification works
[ ] WebSocket authentication works
[ ] Network telemetry works
[ ] Topology model works
[ ] Simulator produces controlled failures
[ ] Anomaly model trained/evaluated
[ ] Incident correlation works
[ ] Root cause model evaluated
[ ] Impact model evaluated
[ ] Propagation model evaluated
[ ] Adaptive policy implemented
[ ] Hard policy constraints implemented
[ ] Deterministic fallback implemented
[ ] Delivery outcomes stored
[ ] ML feedback recorded
[ ] Operations dashboard works
[ ] Network graph works
[ ] Failure injection works
[ ] Unit tests pass
[ ] Integration tests pass
[ ] E2E tests pass
[ ] Reproducible experiments complete
[ ] Baselines compared
[ ] Ablation study complete
[ ] Results statistically summarized
[ ] Patent prior-art search complete
[ ] Patent disclosure prepared
[ ] Figures prepared
[ ] Research paper drafted
[ ] README updated
[ ] Architecture docs updated
[ ] No secrets committed
[ ] No unsupported reliability claims
```

---

# 91. FINAL IMPLEMENTATION PRINCIPLE

Do not build this as:

```text
CampusConnect
+
Chatbot
+
Random ML features
+
Fancy dashboard
```

Build it as:

```text
                CAMPUSCONNECT
                      |
              Network telemetry
                      |
                      v
              ML incident state
                      |
       +--------------+--------------+
       |                             |
       v                             v
 Incident correlation         Impact prediction
       |                             |
       +--------------+--------------+
                      |
                      v
             Adaptive communication
                      |
        +-------------+-------------+
        |             |             |
       TCP           UDP          WebSocket
        |             |             |
        +-------------+-------------+
                      |
                      v
                ACK / outcome
                      |
                      v
                Persistent data
                      |
                      v
                  ML feedback
                      |
                      +----------> next decision
```

**That is the project.**

Everything else—ticketing, authentication, Gemini, dashboards, notifications, knowledge base and campus services—supports this core technical contribution.
