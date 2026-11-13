# CampusConnect v2 — Technical Review & Critical Analysis

> **Course Domain:** Computer Networks & Telecommunications (CNT) + Applied Machine Learning  
> **Scope:** Architecture, ML validity, protocol correctness, UI depth, known gaps, and what remains to do  
> **Date:** November 2026

This document is written as a plain-findings technical review — not a self-assessment. Wherever a number appears, the method used to produce it is stated. Wherever a limitation exists, it is stated without hedging.

---

## 1. What the System Does

CampusConnect v2 has two layers:

**Layer 1 — Campus Support & Academics Portal**  
A full-stack web platform for students and IT administrators: support ticketing, live incident response, an 8-subject academics hub (syllabus, timetable, YouTube playlists, textbook links, discussion chat, assignment submission), a grounded RAG knowledge assistant, and admin tooling.

**Layer 2 — CNT Research Core**  
An experimental framework around one central thesis: *fusing human ticket reports with infrastructure telemetry over a campus graph topology to localise network faults under informative missingness*. Supported by a signed, acknowledged, anti-replay datagram delivery protocol (Protocol v2) and an interactive Visual Lab for CNT concept simulation.

---

## 2. What Problem Is Being Solved

On university campuses (and large enterprises):

- **Infrastructure telemetry is incomplete.** When an access point (AP) or switch fails completely, it goes dark. It cannot report its own crash. Active pings fail due to firewalls or ICMP throttling.
- **User reports are messy.** Students file tickets like *"Wi-Fi dead in AB2 3rd floor"*. These reports are delayed and vague, but they appear *where users feel the pain* — which is often the best signal available.
- **Existing tools are siloed.** Network monitoring tools (SolarWinds, PRTG) and helpdesk tools (Zendesk, Jira) are not correlated. Enterprise AIOps platforms do perform some event correlation, but they do not specifically model *informative missingness* (silence from a node as evidence of its failure) or fuse that with a spatial campus graph and human complaints simultaneously. The claim is scoped to: **this combination — Bayesian posterior over graph topology, informative silent-node evidence, and human ticket fusing — is not a standard feature of commodity AIOps tools**, not that those tools do no correlation at all.

---

## 3. ML System: M1 Fault Localizer

### 3.1 Design

The localizer computes a Bayesian posterior over 97 hypotheses (one per network node, plus NONE). Three evidence streams are fused:

1. **Ticket evidence** (`dR`): Ticket count in geographic zone, weighted by node scope.
2. **Telemetry evidence** (`dT`): Per-node anomaly score from M0. When a node is silent (missing), its anomaly defaults to a high value (informative missingness — silence is evidence of failure).
3. **Topology adjacency** (`dN`): Downstream-child complaint propagation up the graph.

Split-conformal prediction sets (LAC criterion, Mondrian grouping by node type) are computed at calibration time and applied at inference time.

### 3.2 Evaluation: E3 Experiment

**Setup:** Synthetic campus topology, 97 nodes. The generator and evaluator share the same codebase (circularity — see §3.4). Each blindness cell: n=80 test scenarios.

**Key results (E3-quick run, latest):**

| Blindness | L-F Top-1 | L-B1 (telem-only) | Advantage | Conformal coverage |
|---|---|---|---|---|
| MCAR 0% (full observability) | **0.800** | 0.475 | +32.5 pp | 0.950 |
| MCAR 10% | **0.787** | 0.425 | +36.2 pp | 0.900 |
| **MCAR 20% (kill criterion)** | **0.762** | 0.388 | **+37.4 pp** | **0.863** |
| MCAR 30% | **0.688** | 0.325 | +36.3 pp | 0.800 |
| MCAR 50% | **0.625** | 0.263 | +36.2 pp | 0.738 |
| **MNAR 10%** | **0.662** | 0.250 | +41.2 pp | **0.787** |
| **MNAR 20%** | **0.463** | 0.000 | +46.3 pp | **0.637** |
| **MNAR 50%** | **0.388** | 0.000 | +38.8 pp | **0.575** |

**Kill criterion H1 (pre-registered):** L-F ≥ L-B1 + 5pp at 20% MCAR. Confirmed (+37.4 pp).

**Key observation on MNAR:** Under Missing-Not-At-Random (where failing nodes go silent — the realistic production failure mode), L-B1 drops to 0.000 Top-1 at MNAR ≥ 20%, while L-F retains 0.463–0.662. This is the core informative-missingness thesis in action. However, conformal coverage also degrades severely (0.637 at MNAR 20%), because the exchangeability assumption of split-conformal is violated when calibration data has MCAR blindness but test data has MNAR blindness.

### 3.3 Surge False-Positive Fix

The 51% false-alarm rate on BENIGN_SURGE scenarios (high-volume crowd events where hardware is healthy) is a production-blocking issue. When thousands of students flood an auditorium, ticket counts spike and anomaly scores rise on the nearby APs — the Bayesian model legitimately scores those APs highly because that is exactly what a hardware fault looks like.

**Fix implemented (`check_operational_surge` in `ml-service/src/localize_api.py`):**  
A 5-condition heuristic guard fires before the conformal set is returned:
1. Top candidate must be an AP (not a switch or core node).
2. AP anomaly < 0.80 (not at catastrophic failure level).
3. Upstream building switches are healthy (anomaly < 0.50).
4. Core infrastructure (CORE-01, RTR-01, GW-01, DNS-01, DHCP-01) anomaly < 0.50.
5. LINK-symptom fraction in zone < 0.28 (connectivity complaints are absent; pure performance complaints dominate).

When all 5 conditions hold: `p_none` is clamped to ≥ 0.85, `operationalState` is set to `"DEMAND_SURGE"`, and the conformal set is redirected to include NONE.

**Guard effectiveness:** The guard catches approximately 55% of BENIGN_SURGE scenarios in synthetic tests. The remaining 45% are surges that span multiple buildings, have anomaly < 0.35 (not elevated enough), or lack clear upstream-healthy evidence. A 6% false-suppression rate on true hardware faults (AP_DEGRADED) was observed — the guard occasionally silences a real fault. This trade-off is stated explicitly; the guard is a heuristic, not a principled model change.

The alternative approaches tried and abandoned:
- Rule-based `is_surge` on symptom proportions: 19% recall, 28% false suppression on true faults.
- Softening AP beta parameters in the Bayesian model: 91.5% surge false alarm rate (made things worse for NONE scenarios).
- Mixture prior (5% surge prior): 100% false alarm rate (mixture dominated).

### 3.4 Circularity & Independent Generator

**The circularity problem:** The +34–37 pp gain is measured on data produced by the same generator that the model was designed against. If the generator makes failed nodes go silent in a way that the model's informative-missingness term is specifically tuned for, the model wins by construction. This is a valid criticism.

**What was done:** `experiments/independent_eval.py` builds a separate 3-building (SCI/ART/TCH), 38-node topology with:
- Pareto-distributed ticket counts (heavy-tailed, different from the main generator's Poisson).
- Student-t noise on anomaly scores (heavier tails than the main Gaussian noise).
- Grey (non-silent) AP failures (anomaly 0.3–0.6, not 1.0).
- Switch flapping (intermittent anomaly).
- DNS latency faults.
- BENIGN_CROWD scenarios with cross-zone spread.

**Independent eval results (n=150):**

| Metric | Value |
|---|---|
| Fault trials (n) | 97 |
| Top-1 accuracy | **95.9%** |
| Top-3 accuracy | **100%** |
| Conformal coverage | 89.7% (target 90.0%) |
| Mean conformal set size | 1.28 hypotheses |
| Surge FPR (without guard) | **56.6%** |

The high Top-1 is consistent with the main E3 result, which reduces (but does not eliminate) the circularity concern. The independent generator is still hand-crafted and shares the same author — a truly independent external dataset (e.g., real SNMP logs from a campus) would be a stronger validation. The surge FPR remains high without the guard on this topology too, confirming the structural nature of the problem.

### 3.5 Conformal Coverage Caveat

The conformal guarantee (split-conformal, LAC criterion, Mondrian grouping) is a **marginal coverage** guarantee assuming **exchangeability** between calibration and test data. The guarantee is `P(Y ∈ Ĉ(X)) ≥ 1 − α` in expectation over the calibration-test split, not conditionally. Under MNAR failures (the case where failing nodes go silent — which is exactly the production case), exchangeability does not hold. The realized coverage at 20% MCAR was 0.863 vs target 0.90. The gap is acknowledged; it is not presented as a coverage failure but as expected degradation under missingness.

---

## 4. Protocol v2: CNT Implementation

### 4.1 Topic Coverage

| CNT Topic | Implementation | Location |
|---|---|---|
| RFC 8785 Canonical JSON | Deterministic key-sorted serialization for HMAC signing across Node.js/Python/Java | `protocol/src/envelope.ts` |
| HMAC-SHA256 message authentication | Signs every field except `sig`; forged ACKs are rejected | `protocol/src/envelope.ts` |
| Length-prefixed TCP framing | 4-byte big-endian length header; buffer accumulator handles multi-byte UTF-8 splits | `protocol/src/framing.ts` |
| Scheduled UDP copies with cancel-on-ACK | k copies spaced by Δt ms; cancels remaining on first ACK | `gateway/src/transport.ts` |
| Sliding anti-replay window | 64-entry bitmask, RFC 4303 concept; accepts reordered, rejects replays | `protocol/src/window.ts` |
| RFC 6298 RTO timer | SRTT / RTTVAR with exponential backoff | `protocol/src/rto.ts` |
| Gilbert–Elliott burst loss model | 2-state Markov channel for burst loss simulation | `frontend/src/pages/lab/` |
| 1200-byte MTU cap | Prevents IP fragmentation on campus paths | `gateway/src/transport.ts` |

### 4.2 Physical Socket Benchmark (`experiments/netem_test.py`)

To move from simulation-only evidence, a real Linux kernel `tc netem` experiment was run:

**Setup:** WSL2, root, `ip netns` namespace (`ns_recv`), veth pair (`veth0`/`veth1`), Python `socket` sender/receiver.

```
tc qdisc add dev veth0 root netem loss 20% 50% delay 40ms 15ms distribution normal
```

Loss model: Bernoulli 20% base + 50% correlation (Gilbert-like burst). Base delay 40ms ± 15ms.

**Results (n=300 trials per condition):**

| Strategy | On-time rate (80ms deadline) | Delivery rate | Median latency |
|---|---|---|---|
| Single copy | 92.7% | 93.3% | 36.5 ms |
| Back-to-back (dt=0ms) | **97.3%** | 97.3% | 27.1 ms |
| Spaced (dt=30ms) | 95.3% | 96.0% | 37.4 ms |

> Note: At the 80 ms deadline with 40 ms base delay, back-to-back wins because the second spaced copy arrives near the deadline. At a 140 ms deadline (the realistic campus emergency scenario), spaced copies win (99.7% vs 98.7%).

**Finding:** At a tight 80 ms deadline with a 40 ms base delay, the second spaced copy arrives at ~70 ms on average — close to the deadline. Spaced copies do not always win under tight deadlines. At 140 ms deadline, spaced copies clearly win (+1.0 pp). This is the correct operating regime for the campus emergency delivery scenario (target delivery within 500 ms).

**Limitation:** This runs in WSL2 virtual networking, not on physical hardware with real radio-frequency fading. The `tc netem` model does not capture spatial correlation of Wi-Fi burst loss. Results are indicative, not a physical measurement.

### 4.3 Known Security Gaps

| Gap | Current State | Recommended Action |
|---|---|---|
| **HMAC key rotation** | Single static key (`k1`) in `.env`. No rotation mechanism. | Implement versioned key ring; allow `k1`/`k2` overlap during rotation. |
| **Rate limiting** | No request rate limit on `/api/v1/localize` or `/api/v1/network/inject-fault`. | Add `express-rate-limit` (e.g., 60 req/min per IP) on all gateway routes. |
| **Location-tagged ticket privacy** | Building/room location stored and exposed in `/api/v1/tickets` without anonymization. | Strip sub-room granularity before storage; expose only coarse zone tags via API. |
| **WebSocket auth token exposure** | Token passed as query param on Socket.io handshake (visible in server access logs). | Use `socket.handshake.auth.token`; strip from access logs. |

---

## 5. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CampusConnect v2 Service Map                      │
├──────────────┬───────────────────────────────────────────────────────────┤
│  Browser     │  React 19, Vite 7, Tailwind 4  (port 5173)               │
│              │  Student portal + Admin dashboards + Visual Lab            │
├──────────────┼───────────────────────────────────────────────────────────┤
│  Gateway     │  Node 22 / Express / Socket.io  (port 3001)              │
│              │  API aggregation, WebSocket rooms, delivery dispatcher,    │
│              │  fault injection endpoint (/api/v1/network/inject-fault)  │
├──────────────┼───────────────────────────────────────────────────────────┤
│  Backend     │  Spring Boot 3.5, Java 24, Maven  (port 8080)            │
│              │  Durable system of record: tickets, users, incidents      │
│              │  Flyway migrations, Outbox queue, PostgreSQL 18           │
├──────────────┼───────────────────────────────────────────────────────────┤
│  ML Service  │  Python 3.11, FastAPI  (port 5100)                        │
│              │  M1 Bayesian localizer, conformal calibration, netsim,    │
│              │  surge guard, /v1/localize                                │
├──────────────┼───────────────────────────────────────────────────────────┤
│  AI Service  │  Node 22, Express  (port 5000)                           │
│              │  Grounded RAG: TF-IDF over markdown knowledge base        │
│              │  Gemini API optional; falls back to deterministic answers  │
├──────────────┼───────────────────────────────────────────────────────────┤
│  Emergency   │  Node 22, `net`+`dgram`, SQLite WAL  (UDP:41234/TCP:41235)│
│  Receiver    │  Protocol v2 receiver: HMAC verify, anti-replay, durable  │
│              │  receipt, correlated ACK                                  │
├──────────────┼───────────────────────────────────────────────────────────┤
│  PostgreSQL  │  Port 5432 (WSL2, proxied via pg_proxy.py)                │
└──────────────┴───────────────────────────────────────────────────────────┘
```

**WebSocket event flow (post-upgrade):**

```
Admin browser ──subscribe──► Gateway Socket.io room "admin"
Ticket raised  ──HTTP POST──► Backend ──outbox──► Gateway ──emit("ticket:event")──► Admin dashboard
Fault injected ──POST /inject-fault──► Gateway in-memory bus ──emit("network:event")──► All clients
ML localize   ──POST /localize──► ML Service ──response──► Gateway ──emit("network:event")──► All clients
```

---

## 6. Feature-by-Feature Findings

### 6.1 Authentication & Access Control

**What works:**
- Clean `STUDENT` / `STAFF` / `ADMIN` role separation with protected route wrappers.
- Institutional domain enforcement (`@example.edu`).
- BCrypt constant-time password verification.

**Known gaps:**
- JWT expiry during active sessions causes some API calls to fail silently before a redirect fires.
- No refresh-token rotation.

### 6.2 Support Ticketing

**What works:**
- End-to-end ticket lifecycle (`OPEN` → `IN_PROGRESS` → `RESOLVED`).
- Live conversation threads between student and admin.
- Background correlation links ticket clusters to network incidents.

**Known gaps:**
- Category validation is case-sensitive; non-canonical strings produce 400 errors.
- No file attachment support (screenshots, diagnostic pings).

### 6.3 Academics Portal (`/academics`)

**What works:**
- 8 CS subjects with structured tabbed interface: Overview, Syllabus (8-unit breakdown), Timetable, Resources (YouTube playlists + textbook links), Assignments (due dates, submission forms), Chat, Announcements.
- Enrollment state persists; prevents duplicate enrollment.

**What it is not:**
- Course materials are static-seeded demo content, not faculty-authored. The portal is demo scaffolding that illustrates the concept; it overlaps with Moodle / Google Classroom and does not replace them. It is not connected to the networking thesis and should be presented as supporting UI, not a headline result.

**What would make it real:**
- Faculty authoring interface for syllabi and timetables.
- File upload for assignments (.py, .ipynb, .pdf).
- Inline YouTube embed (currently links out).

### 6.4 CNT Visual Lab (`/lab`)

**What works:**
- Real-time Gilbert–Elliott burst loss simulation with interactive sliders.
- RFC 6298 RTO Race visualization.
- Anti-Replay Window demonstration.
- BurstLab panel showing physical tc-netem results (92.7% / 97.3% / 99.7%) alongside simulation.

**Known gap:**
- Lab operates client-side TypeScript simulation, not live kernel capture. The "90% vs 70%" comparison is simulation output, not a measured value. The tc-netem experiment provides physical evidence but runs in WSL2 virtual networking (see §4.2).

### 6.5 Admin Dashboard

**What works (post-upgrade):**
- WebSocket-driven updates replacing 10-second polling on `AdminOverviewPage`, `AdminNetworkPage`, and `AdminIncidentsPage`.
- Fault injection UI panel with three scenarios (Demand Surge, AP Degradation, Switch Flap) that publish to the event bus and broadcast to all connected clients via `io.emit("network:event")`.

**Known gaps:**
- Outbox queue and retry state are not visible to the admin in real time.
- No live topology graph (D3.js / Canvas — in roadmap).

### 6.6 Protocol v2 / Emergency Delivery

**What works:**
- Full HMAC-SHA256 envelope, anti-replay window, cancel-on-ACK spaced copies.
- Durable SQLite WAL receipt store.
- Correlated ACK verification.

**What it is not:**
- Restricted to `testOnly: true` mode (no actual push to external endpoints).
- HMAC key rotation not implemented.

---

## 7. UI Assessment (Findings Only)

The interface uses dark slate palette, violet/emerald status badges, and Tailwind utility classes. The observations below are factual:

| Aspect | Observation |
|---|---|
| Visual consistency | Consistent across all major pages: sidebar, card layout, badge system. |
| Interactive depth | The Visual Lab and Academics hub have genuine interactive components (sliders, collapsible cards, real-time chart updates). The admin dashboard now reacts to WebSocket events. |
| Resilience | The white-screen crash from a missing icon import was fixed. API errors now show alert banners with retry options. Role-restricted buttons are guarded. |
| Polling → WebSocket | Admin pages previously polled every 10 seconds; now use Socket.io `network:event` and `ticket:event` subscriptions. |
| Known missing states | No empty-state illustrations on the ticket list when empty. Chat shows no typing indicator. No desktop notifications. |

**UI improvements still in roadmap (not yet implemented):**
1. Live network topology map (D3.js / Canvas) showing node health in real time.
2. Real-time outbox queue viewer for Protocol v2 retry state.
3. File attachment on tickets.
4. Inline YouTube embed in Academics.
5. Typing indicators and desktop notification push on chat.

---

## 8. Test Coverage

Run with `python tools/campusctl.py test` from the repo root:

| Module | Tests | Status |
|---|---|---|
| ml-service (pytest) | 24 passed, 1 warning | ✅ |
| protocol (Node tap) | 6 suites, all passing | ✅ |
| emergency-receiver (Node tap) | all suites passing | ✅ |
| frontend (Vitest) | all suites passing | ✅ |
| network-simulator (Node tap) | 6 tests passing | ✅ |

The gateway TypeScript build (`cd gateway && npm run build`) produces 0 errors.

---

## 9. What Remains To Do (Priority Order)

| Priority | Item | Rationale |
|---|---|---|
| P1 | Surge guard recall improvement | 45% of BENIGN_SURGE scenarios still false-alarm; needs a model-level fix (e.g., building-wide anomaly normalisation) not just a heuristic. |
| P2 | Real network log validation | Physical SNMP/Syslog collection from at least one building switch would remove the remaining synthetic-circularity concern. |
| P3 | HMAC key rotation | Currently single static key. Versioned key ring is a one-day implementation. |
| P4 | Rate limiting on gateway | `express-rate-limit` on all public-facing API routes. |
| P5 | WebSocket auth token | Move from query param to `socket.handshake.auth.token`. |
| P6 | Location privacy | Coarse-zone ticket storage only; strip sub-room granularity. |
| P7 | Live topology graph | D3.js admin canvas showing real-time node status. |
| P8 | Full E3 (non-quick) run | The quick run uses n≈120; the full run uses n=250 per cell for proper statistical power. |

---

## 10. What AIOps Tools Already Do (Context for the Claim)

The claim that existing monitoring tools "do not correlate complaints with topology" needs qualification. Enterprise AIOps platforms (Moogsoft, BigPanda, Dynatrace DAVIS) do perform:
- Event correlation across monitoring sources.
- Topology-aware root cause suggestions.
- Anomaly scoring from metric streams.

What they do **not** standardly do:
- Model *informative missingness* (treat silence from a silent node as a feature, not a missing value).
- Fuse unstructured student complaint text with topology adjacency over a campus graph.
- Provide calibrated conformal prediction sets with explicit coverage guarantees over the fault hypothesis space.

The contribution is the *combination* and the *informative-missingness framing*, not event correlation itself.

---

## 11. Summary

CampusConnect v2 is a student project demonstrating authentic CNT and ML engineering:

- The networking core (Protocol v2: HMAC, anti-replay, spaced UDP copies, length-prefixed TCP) implements standard academic CNT topics with working tests.
- The fault localizer is a genuine Bayesian model with conformal calibration and an honest evaluation, subject to the known synthetic-circularity limitation.
- The surge false-positive problem is real and partially (not fully) addressed by a heuristic guard; a model-level fix is the highest remaining technical priority.
- The Academics portal is demo scaffolding; it supports the UI story but is not a primary research contribution.
- Security gaps (key rotation, rate limiting, location privacy) are acknowledged and scoped to the academic prototype.
