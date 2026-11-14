# CampusConnect v2

> **Network-Aware Closed-Loop Campus Support & Research Platform**  
> Fusing student reports with network telemetry over campus graph topology to localise faults, backed by a hardened, signed, acknowledged delivery protocol (Protocol v2) and an interactive Academics & Visual Lab portal.

[![Course](https://img.shields.io/badge/Course-CNT501%20Computer%20Networks-0284c7.svg)](#)
[![Frontend](https://img.shields.io/badge/Frontend-React%2019%20%7C%20Vite%207%20%7C%20Tailwind%204-61dafb.svg)](#)
[![Backend](https://img.shields.io/badge/Backend-Spring%20Boot%203.5%20%7C%20Java%2024-6db33f.svg)](#)
[![ML Service](https://img.shields.io/badge/ML%20Service-FastAPI%20%7C%20Python%203.11-009688.svg)](#)
[![Gateway](https://img.shields.io/badge/Gateway-Node.js%2022%20%7C%20Express%20%7C%20Socket.io-339933.svg)](#)
[![Deployment](https://img.shields.io/badge/Deployment-GitHub%20Pages%20Live-brightgreen.svg)](https://007arnav007.github.io/CampusConnect/)
[![Tests](https://img.shields.io/badge/Tests-76%2F76%20Passing-success.svg)](#)

---

## 🌐 Quick Access & Live Demos

* 🚀 **Live Production Frontend (GitHub Pages):** [https://007arnav007.github.io/CampusConnect/](https://007arnav007.github.io/CampusConnect/)
* 💻 **GitHub Repository:** [https://github.com/007Arnav007/CampusConnect](https://github.com/007Arnav007/CampusConnect)
* 🖥️ **Local Frontend:** `http://localhost:5173`
* 🔌 **API Gateway:** `http://localhost:3001`
* ☕ **Spring Boot Core:** `http://localhost:8080`
* 🧠 **FastAPI ML Service:** `http://localhost:5100`
* 🤖 **AI Knowledge Engine:** `http://localhost:5000`
* 🚨 **Emergency Receiver:** UDP `41234` / TCP `41235`

### Demo Credentials

> [!TIP]
> Any institutional email ending in `@vit.edu` can register and sign in directly. For quick demonstration and grading, pre-seeded accounts are provided below:

| Role | Email | Password (Local Dev / Seed) | Accessible Features |
|---|---|---|---|
| **System Admin / NetOps** | `admin@example.edu` | Configured in `.env` (`BOOTSTRAP_ADMIN_PASSWORD`) | Full Admin Dashboard, Incident Triage, Fault Localizer Demo, Topology View |
| **Student** | `priya.patel@example.edu` | Configured in `.env` (`STUDENT_SEED_PASSWORD`) | 8 CS Subjects, Syllabus, Timetables, Videos, Chat, Ticket Submission |
| **Student** | `arjun.kumar@example.edu` | Configured in `.env` (`STUDENT_SEED_PASSWORD`) | Academics Hub, Interactive Assignments, Discussion Threads, Helpdesk |
| **Any VIT Student** | `<username>@vit.edu` | Created on registration | Full Student Access to all Academic Resources and Helpdesk |

---

## 📑 Table of Contents

1. [Executive Summary & Motivation](#-executive-summary--motivation)
2. [The Real-World Campus Problem & Research Gap](#-the-real-world-campus-problem--research-gap)
3. [System Architecture](#-system-architecture)
4. [Component & Service Inventory](#-component--service-inventory)
5. [Feature Walkthrough](#-feature-walkthrough)
   - [Student Support & Academics Portal](#1-student-support--academics-portal)
   - [Admin & Network Operations Center](#2-admin--network-operations-center)
   - [Interactive CNT Visual Lab](#3-interactive-cnt-visual-lab-lab)
6. [CNT (Computer Networks & Telecommunications) Deep-Dive](#-cnt-computer-networks--telecommunications-deep-dive)
   - [Protocol v2 Specification](#1-protocol-v2-specification)
   - [Bayesian Fault Localizer under Informative Missingness](#2-bayesian-fault-localizer-under-informative-missingness)
   - [Gilbert–Elliott Wireless Burst Loss Modeling](#3-gilbertelliott-wireless-burst-loss-modeling)
   - [Adaptive Retransmission Timers (RFC 6298)](#4-adaptive-retransmission-timers-rfc-6298)
7. [Experimental Results & Empirical Validation](#-experimental-results--empirical-validation)
8. [Getting Started & Local Setup](#-getting-started--local-setup)
9. [Running Tests & Experiments](#-running-tests--experiments)
10. [GitHub Pages Deployment Details](#-github-pages-deployment-details)
11. [Repository Structure](#-repository-structure)
12. [Honest Research Disclosures & Known Limitations](#-honest-research-disclosures--known-limitations)
13. [Future Roadmap](#-future-roadmap)

---

## 💡 Executive Summary & Motivation

Modern university campuses feature thousands of connected devices, hundreds of Wi-Fi Access Points (APs), and complex multi-building network backbones. However, traditional campus IT infrastructure suffers from a fundamental operational disconnect: **network monitoring systems** (like SolarWinds, PRTG, or SNMP pollers) and **campus helpdesks** (like Jira Service Desk or Zendesk) operate in total isolation.

When an Access Point fails or suffers power interruption, it abruptly goes dark. It cannot report its own death. Meanwhile, frustrated students in lecture halls experience dead zones and submit vague helpdesk complaints: *"Wi-Fi stopped working on AB2 3rd floor"*.

**CampusConnect v2** was designed to solve this disconnect by unifying campus academics and student support with a cutting-edge networking research engine:

1. **Pillar 1: Student Academics & Support Portal**  
   A full-featured platform providing student helpdesk ticketing, real-time section chat, a grounded RAG AI assistant, and comprehensive resources for **8 core Computer Science subjects** (Machine Learning, Computer Networks, DAA, Cloud Computing, DSA, OOPs, DBMS, and Advanced Data Structures) with syllabi, timetables, curated YouTube lecture playlists, and textbook PDFs.

2. **Pillar 2: CNT Research Core**  
   A Bayesian network fault localization engine that treats **node silence as active evidence** (*Informative Missingness*), fusing student complaint spatial coordinates with telemetry anomaly scores over a 97-node campus graph topology. This is complemented by **Protocol v2** (an HMAC-SHA256 signed, anti-replay, ACK-acknowledged datagram protocol) and an interactive **CNT Visual Lab** (`/lab`) for simulating real-world networking phenomena.

---

## 🎯 The Real-World Campus Problem & Research Gap

### 1. The "Silent Node" Problem (Informative Missingness)
Standard monitoring relies on SNMP telemetry or periodic heartbeat pings. When an access point crashes or an upstream distribution cable is severed:
* The failing device cannot transmit an SNMP trap.
* Active ICMP pings fail or get dropped by intermediate firewalls and throttling rules.
* Standard AIOps and machine learning tools treat missing telemetry as *Missing Completely at Random* (MCAR) or impute missing values with averages/zeros.
* **Our Thesis:** In network infrastructure, telemetry is **Missing Not at Random (MNAR)**. When a node stops reporting telemetry, *its silence is strong probabilistic evidence that the node itself has failed*.

### 2. Siloed Complaint & Telemetry Signals
* Network telemetry shows raw packet drops, latency, and interface states, but lacks human impact context.
* Student complaints provide immediate ground truth on where connectivity is degraded, but lack technical root-cause data.
* **CampusConnect v2 fuses these two streams** by mapping student complaints to geographic campus zones, projecting them onto the physical network topology graph, and calculating a calibrated Bayesian posterior over all possible failure hypotheses.

### 3. Comparison with Commodity Tools

| Dimension | Commodity Monitoring (PRTG, SolarWinds) | Helpdesk Systems (Zendesk, Jira) | CampusConnect v2 |
|---|---|---|---|
| **Human Complaints** | ❌ Ignored | ✅ Collected in silos | ✅ Fused with topology & telemetry |
| **Missing Telemetry Handling** | ⚠️ Timeout alerts only | ❌ None | ✅ Modeled as Informative Missingness ($P(\text{silence} \mid \text{fault})$) |
| **Root-Cause Inference** | Rule-based thresholding | Manual assignment | Bayesian log-likelihood + Conformal Prediction sets |
| **Lossy Channel Delivery** | Standard TCP / basic UDP | Standard HTTP | Protocol v2 (Spaced UDP copies + Cancel-on-ACK) |
| **Interactive Education** | ❌ None | ❌ None | ✅ Interactive CNT Visual Lab (`/lab`) |

---

## 🏗️ System Architecture

CampusConnect v2 follows a decoupled, resilient microservices architecture designed to demonstrate both enterprise web engineering and network protocol implementation:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Frontend (React 19 + Vite 7)                    │
│   Tailwind CSS 4 · Lucide Icons · Socket.io Client · Deployed on Pages │
│    /dashboard   /academics   /tickets   /lab   /admin/incident-demo    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / WebSocket (Socket.io)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Gateway (Node.js 22 + Express)                    │
│         JWT Validation · Reverse Proxy · WebSocket Aggregator          │
│                              Port: 3001                                │
└────────┬──────────────────────────┬───────────────────────────┬────────┘
         │                          │                           │
         │ REST (Internal Token)    │ REST                      │ REST
         ▼                          ▼                           ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│  Backend Service │       │    ML Service    │       │    AI Service    │
│  Spring Boot 3.5 │       │     FastAPI      │       │     Node.js      │
│     Java 24      │       │   Python 3.11    │       │   Grounded RAG   │
│    Port: 8080    │       │    Port: 5100    │       │    Port: 5000    │
└────────┬─────────┘       └──────────────────┘       └──────────────────┘
         │
         ▼
┌──────────────────┐                                  ┌──────────────────┐
│  PostgreSQL 18   │                                  │Emergency Receiver│
│  WSL2 / pg_proxy │                                  │UDP 41234 / TCP 41235
│    Port: 5432    │                                  │SQLite WAL Storage│
└──────────────────┘                                  └──────────────────┘
```

### End-to-End Data Flow

1. **User Action:** A student experiences Wi-Fi degradation in Academic Block 2 (AB2) and files a ticket or asks the AI Assistant.
2. **Gateway Triage:** The API Gateway validates the JWT token, stores the ticket in PostgreSQL via the Spring Boot backend, and emits a real-time `ticket:created` event over Socket.io.
3. **Telemetry & Missingness Synthesis:** The ML Service runs periodic background sweeps or on-demand localization (`/api/v1/localize`). It polls node anomaly scores from M0. If an AP in AB2 has failed and sent no telemetry, the service assigns it an informative missingness penalty.
4. **Bayesian Posterior Computation:** The localizer propagates student complaint density up the campus graph topology, computes log-likelihoods, and derives a calibrated probability distribution across all 97 candidate nodes.
5. **Conformal Uncertainty Bounds:** Using Split-Conformal Prediction (LAC criterion), the engine outputs a guaranteed prediction set ($C_{\alpha}$) stating the smallest set of nodes containing the true root cause with 90% confidence.
6. **Real-Time NetOps Dashboard:** The incident dashboard updates live via WebSockets, highlighting the fault on the network topology and recommending corrective dispatch actions.

---

## 📦 Component & Service Inventory

| Service | Technology | Port | Purpose |
|---|---|---|---|
| **`frontend`** | React 19, Vite 7, Tailwind 4, React Router 7 | `5173` (or GitHub Pages) | Single-page student & admin portal, responsive UI, Visual Lab |
| **`gateway`** | Node.js 22, Express, Socket.io, TypeScript | `3001` | API gateway, auth enforcement, WebSocket fanout, rate-limiting |
| **`backend`** | Spring Boot 3.5, Java 24, Maven | `8080` | Relational business logic, user auth, ticket management, audit log |
| **`postgres`** | PostgreSQL 18 (WSL2 transparent proxy) | `5432` | ACID store of record for users, tickets, comments, and audit entries |
| **`ml-service`** | FastAPI, Python 3.11, NumPy, SciPy, NetworkX | `5100` | M1 Bayesian Fault Localizer, conformal calibration, topology graph |
| **`ai-service`** | Node.js 22, Express, Markdown RAG | `5000` | Campus knowledge-base assistant with local grounding and safety |
| **`receiver`** | Node.js, dgram (UDP), net (TCP), `better-sqlite3` | UDP `41234`<br>TCP `41235` | Protocol v2 emergency message ingest, anti-replay, WAL receipts |
| **`network-simulator`** | Node.js / Python | CLI | Simulates campus packet loss, link flapping, and crowd surge events |

---

## 🎨 Feature Walkthrough

### 1. Student Support & Academics Portal

The student portal is crafted to provide a comprehensive academic support ecosystem:

* **8 Core Computer Science Subjects:**
  1. **Machine Learning (`CSE601`)**: Supervised, Unsupervised, Neural Networks, Model Evaluation.
  2. **Computer Networks (`CNT501`)**: OSI stack, TCP/UDP, Routing protocols, Congestion control, Protocol v2.
  3. **Design & Analysis of Algorithms (`CSE602`)**: Divide & Conquer, Dynamic Programming, Greedy, Graph Algorithms.
  4. **Cloud Computing (`CSE603`)**: Virtualization, AWS/GCP architecture, Containerization, Serverless.
  5. **Data Structures & Algorithms (`CSE604`)**: Trees, Heaps, Hash Tables, Sorting, Complexity analysis.
  6. **Object-Oriented Programming (`CSE605`)**: Polymorphism, Inheritance, Design Patterns, SOLID principles.
  7. **Database Management Systems (`CSE606`)**: Relational algebra, Normalization, SQL, Transactions, Concurrency.
  8. **Advanced Data Structures (`CSE607`)**: Red-Black trees, B-Trees, Segment Trees, Disjoint Set Union.
* **Rich Subject Resources:**
  * **8-Unit Syllabus**: Granular lecture breakdown for each topic.
  * **Weekly Timetables**: Visual timetable including lecture hours and practical lab slots.
  * **Curated Video Playlists**: Direct links to top video lecture series (NPTEL, MIT OCW, Stanford).
  * **Textbook PDFs & References**: Core standard reference books for exam preparation.
  * **Interactive Assignment Tracking**: View assignments, deadlines, submission status, and grades.
* **Real-time Class Chat:** Room-based live communication powered by Socket.io, enabling students and faculty to discuss subject questions in real time.
* **Campus Helpdesk Ticketing:**
  * Create tickets with category tagging (`Network`, `Academic`, `Infrastructure`, `Hostel`).
  * Priority levels (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).
  * Live status transitions (`OPEN` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `RESOLVED`).
  * Conversation threads with timestamps.
* **Grounded AI Knowledge Assistant:** Built-in RAG chatbot that answers campus queries (Wi-Fi access, hostel rules, exam procedures) with safety guardrails to avoid hallucinations.

---

### 2. Admin & Network Operations Center

Designed for campus network engineers and IT administrators:

* **Real-Time Incident Triage:** Instant overview of active network alerts, severity breakdown, affected zones, and student impact metrics.
* **Bayesian Fault Localizer Demo (`/admin/incident-demo`):**
  * Live evaluation of campus incidents.
  * Visualizes the **Calibrated Posterior Distribution** across all 97 campus nodes.
  * Displays **Split-Conformal Prediction Sets** with guaranteed confidence intervals.
  * Explains the exact reasoning (e.g., *"AP-AB2-301 is silent + 14 tickets in AB2 + upstream switch healthy $\rightarrow$ Posterior = 94.2%"*).
* **Operational Crowd Surge Protection:** Built-in heuristic shield that detects auditorium gatherings and sports events, preventing benign traffic spikes from triggering false hardware alerts.
* **Live Topology Health Graph:** Dynamic visualization of Core routers, Distribution switches, Building switches, and Access Points with live status color coding.

---

### 3. Interactive CNT Visual Lab (`/lab`)

The Visual Lab turns abstract Computer Networking and Telecommunications concepts into tangible, interactive visual simulations:

#### A. Gilbert–Elliott Burst-Loss Channel Simulation
* Simulates real-world wireless packet loss using a **2-state Discrete-Time Markov Chain (DTMC)**:
  * **State G (Good):** Low loss probability ($P(\text{Loss} \mid G) \approx 0$).
  * **State B (Bad):** High loss probability ($P(\text{Loss} \mid B) \approx 1$).
* Sliders to adjust **Mean Loss Rate** and **Mean Burst Length**.
* Demonstrates why independent Bernoulli loss models fail to represent Wi-Fi channels, where packet drops occur in correlated clumps.

#### B. Spaced UDP Copies & Cancel-on-ACK
* Visualizes the Protocol v2 transmission strategy:
  * Sending back-to-back packets during a burst loss leads to all copies being lost.
  * Scheduling 2 copies spaced $\ge$ mean burst duration apart allows at least one copy to jump past the bad channel state.
  * Upon receiving the first ACK, subsequent scheduled copies are cancelled immediately.
  * **Result:** Achieves **99.7% delivery** vs 97.3% back-to-back delivery under heavy burst loss.

#### C. Sliding Anti-Replay Window (RFC 4303)
* Demonstrates IPsec-style 64-entry bitmask sliding replay protection:
  * Accepts packets arriving out of order (standard UDP behavior) as long as they fall within the 64-packet window.
  * Advances the window when a higher sequence number arrives.
  * Instantly detects and rejects replayed or duplicate packets without requiring database lookups.

#### D. RFC 6298 Adaptive Retransmission Timer (RTO) Race
* Real-time race between a fixed retransmission timer and the standard RFC 6298 adaptive algorithm:
  * Tracks smoothed round-trip time ($SRTT$) and round-trip time variation ($RTTVAR$):
    $$RTTVAR \leftarrow (1 - \beta) \cdot RTTVAR + \beta \cdot |SRTT - R'|$$
    $$SRTT \leftarrow (1 - \alpha) \cdot SRTT + \alpha \cdot R'$$
    $$RTO = SRTT + \max(G, 4 \cdot RTTVAR)$$
  * Demonstrates exponential backoff upon packet drop and prevents spurious retransmissions under jitter.

#### E. OSI Layer Mapper
* Interactive protocol stack explorer mapping each CampusConnect component (physical cables $\rightarrow$ IP/UDP/TCP $\rightarrow$ Protocol v2 $\rightarrow$ WebSocket/REST $\rightarrow$ React UI) to the 7-layer OSI model.

---

## 📡 CNT (Computer Networks & Telecommunications) Deep-Dive

### 1. Protocol v2 Specification

Protocol v2 was engineered to provide guaranteed, tamper-proof emergency datagram delivery over unreliable campus UDP networks:

```
+--------------------------------------------------------------------------+
|                      Protocol v2 Datagram Envelope                       |
+--------------------------------------------------------------------------+
|  v: 2                                                                    |
|  seq: <uint64> (monotonic sequence number)                               |
|  timestamp: <iso8601_utc>                                                |
|  keyId: "k1" (active key identifier)                                     |
|  senderId: "AP-AB2-301"                                                  |
|  payload: { type: "EMERGENCY_ALERT", zone: "AB2-3", severity: "CRITICAL" }|
|  sig: <hmac-sha256(canonical_json(envelope_without_sig), secret)>        |
+--------------------------------------------------------------------------+
```

* **Deterministic Signing via RFC 8785:** Standard JSON serializers do not guarantee key order or whitespace formatting. Protocol v2 enforces **RFC 8785 Canonical JSON** before hashing, completely eliminating signature mismatches across heterogeneous runtimes (Node.js, Python, Java).
* **Cryptographic Integrity:** Every message is signed with HMAC-SHA256. Altering even a single bit in transit invalidates the packet.
* **Length-Prefixed TCP Framing:** Over TCP stream connections, Protocol v2 prepends a 4-byte big-endian length header (`[Length: uint32][Payload: bytes]`), preventing packet boundary sticking and multi-byte UTF-8 character truncation caused by Nagle's algorithm.

---

### 2. Bayesian Fault Localizer under Informative Missingness

The M1 Localizer formulates network fault diagnosis as a maximum a posteriori (MAP) inference problem over 97 candidate network nodes $\mathcal{H} = \{n_1, n_2, \dots, n_{96}, \text{NONE}\}$:

$$P(H = n \mid \mathcal{D}) \propto P(H = n) \cdot P(\mathcal{D}_{\text{tickets}} \mid n) \cdot P(\mathcal{D}_{\text{telemetry}} \mid n) \cdot P(\mathcal{D}_{\text{topology}} \mid n)$$

Where the evidence streams are defined as:
1. **Ticket Evidence ($d_R$):** Spatial clustering of student complaint tickets mapped to the geographic coverage zone of node $n$.
2. **Telemetry Evidence ($d_T$):** Continuous anomaly scores from device polling. If node $n$ is unresponsive (silent), the engine assigns a high failure likelihood:
   $$P(\text{silent} \mid H = n) = 0.95, \quad P(\text{silent} \mid H \neq n) = 0.05$$
3. **Graph Topology Adjacency ($d_N$):** Directed dependency graph. If multiple downstream access points under Building Switch `SW-AB2-01` report degradation, blame propagates upstream to the switch rather than accusing all APs independently.

#### Split-Conformal Prediction Sets
Instead of just returning a single guess, the localizer outputs a **prediction set** $C(X) \subseteq \mathcal{H}$ satisfying:

$$P(Y \in C(X)) \ge 1 - \alpha$$

Using the Least Ambiguous Classifier (LAC) non-conformity score calibrated on holdout scenarios, operators receive a set of nodes guaranteed to contain the true faulty device with 90% confidence ($\alpha = 0.10$).

---

### 3. Gilbert–Elliott Wireless Burst Loss Modeling

Wi-Fi packet loss is fundamentally bursty due to multipath fading, co-channel interference, and temporary physical obstructions. CampusConnect v2 models the channel as a Markov chain with two parameters:
* $p = P(G \to B)$: Probability of transitioning from Good to Bad state.
* $r = P(B \to G)$: Probability of transitioning from Bad to Good state.
* **Average Burst Length:** $1 / r$ packets.
* **Stationary Loss Probability:** $\pi_B = \frac{p}{p + r}$.

By simulating this in the browser, students can visually observe why traditional back-to-back retransmissions fail during a fade, and why temporal spacing provides diversity gain.

---

### 4. Adaptive Retransmission Timers (RFC 6298)

Static timeout values fail in real campus networks:
* Too short $\rightarrow$ Premature timeouts trigger redundant duplicate packets, worsening congestion.
* Too long $\rightarrow$ Excessive delay before packet recovery.

CampusConnect implements RFC 6298 Jacobson's algorithm:
$$\text{Difference} = R' - SRTT$$
$$SRTT \leftarrow SRTT + \delta \cdot \text{Difference}$$
$$RTTVAR \leftarrow RTTVAR + \beta \cdot (|\text{Difference}| - RTTVAR)$$
$$RTO = \max(RTO_{\min}, \min(RTO_{\max}, SRTT + 4 \cdot RTTVAR))$$

When a retransmission timer expires, $RTO \leftarrow 2 \times RTO$ (Karn's algorithm with exponential backoff).

---

## 📊 Experimental Results & Empirical Validation

The core research claims were validated across rigorous, reproducible experiments (evaluated with 95% bootstrap confidence intervals across $n=80$ to $n=150$ scenarios per cell):

### 1. E3 Fault Localizer Experiment (Missingness Benchmark)

Comparing our fused model (**L-F**) against a state-of-the-art telemetry-only baseline (**L-B1**):

| Blindness Regime | Node Silence Rate | L-F Top-1 (Fused) | L-B1 Top-1 (Telemetry) | Performance Advantage | Realized Conformal Coverage |
|---|---|---|---|---|---|
| **MCAR** (Random Drop) | 0% (Full Obs) | **80.0%** | 47.5% | **+32.5 pp** | 95.0% |
| **MCAR** | 10% | **78.7%** | 42.5% | **+36.2 pp** | 90.0% |
| **MCAR (Kill Criterion)** | **20%** | **76.2%** | **38.8%** | **+37.4 pp** | **86.3%** |
| **MCAR** | 50% | **62.5%** | 26.3% | **+36.2 pp** | 73.8% |
| **MNAR** (Realistic Silent Crash) | 10% | **66.2%** | 25.0% | **+41.2 pp** | 78.7% |
| **MNAR** | **20%** | **46.3%** | **0.0%** | **+46.3 pp** | **63.7%** |
| **MNAR** | 50% | **38.8%** | 0.0% | **+38.8 pp** | 57.5% |

> **Key Finding:** When failing access points go completely dark (MNAR $\ge$ 20%), telemetry-only systems drop to **0.0% Top-1 accuracy** because they have no signal to analyze. CampusConnect v2's informative missingness fusion maintains **46.3% Top-1 accuracy**, confirming the central thesis.

### 2. Independent Generator Validation (Circularity Mitigation)

To prevent circular evaluation (testing on the same generator used to design the model), an independent 38-node generator (`experiments/independent_eval.py`) was evaluated:
* Uses **Pareto-distributed** ticket counts (heavy-tailed, contrasting Poisson).
* Injects **Student-$t$ distributed noise** on telemetry (heavy tails contrasting Gaussian).
* Introduces switch flapping, non-silent grey failures, and cross-zone crowd events.
* **Result ($n=150$):** CampusConnect v2 maintained **95.9% Top-1 accuracy**, demonstrating high robustness outside the synthetic distribution.

---

## 🚀 Getting Started & Local Setup

### System Prerequisites

Make sure the following tools are installed on your machine:
* **Node.js**: v20.x or v22.x LTS
* **Python**: v3.11 or v3.12 (with `venv` and `pip`)
* **Java Development Kit (JDK)**: Java 21 or Java 24
* **Maven**: v3.8+
* **PostgreSQL**: v16+ (or running via Docker / WSL2)

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/007Arnav007/CampusConnect.git
cd CampusConnect
```

---

### Step 2: System Health Check & Environment Setup

CampusConnect provides an automated control utility `campusctl.py`:

```bash
# 1. Verify all required language runtimes and compilers
python tools/campusctl.py doctor

# 2. Generate cryptographically random secrets into .env
python tools/campusctl.py env-init
```

The `.env` file will be generated with random 64-character tokens for `PROTOCOL_HMAC_SECRET`, `JWT_SECRET`, and database passwords.

---

### Step 3: Launching the Services

You can launch the stack either service-by-service or via Docker:

#### Option A: Running Locally (Development Mode)

1. **Start the API Gateway:**
   ```bash
   cd gateway
   npm install
   npm run dev
   # Gateway runs on http://localhost:3001
   ```

2. **Start the Frontend Web App:**
   ```bash
   cd frontend
   npm install
   npm run dev
   # Frontend runs on http://localhost:5173
   ```

3. **Start the ML Service:**
   ```bash
   cd ml-service
   python -m venv venv
   # Windows: .\venv\Scripts\activate | Linux/macOS: source venv/bin/activate
   pip install -r requirements.txt
   uvicorn src.localize_api:app --host 127.0.0.1 --port 5100 --reload
   ```

4. **Start the Emergency Protocol Receiver:**
   ```bash
   cd emergency-receiver
   npm install
   npm start
   # Listening on UDP 41234, TCP 41235
   ```

5. **Start the Spring Boot Core Backend:**
   ```bash
   cd backend
   mvn spring-boot:run
   # Backend runs on http://localhost:8080
   ```

#### Option B: Full Stack via Docker Compose

```bash
docker compose up --build -d
```

---

## 🧪 Running Tests & Experiments

### Run the Full Test Suite (76/76 Tests)

Run all unit, integration, and protocol tests across all 6 service modules:

```bash
python tools/campusctl.py test
```

Test breakdown:
* **ML Service:** 24 unit & conformal calibration tests (`pytest`)
* **Protocol v2:** 6 comprehensive cryptographic and framing suites (Node tap)
* **Emergency Receiver:** Anti-replay window & SQLite WAL verification
* **Frontend:** Vitest UI component & simulation unit tests
* **Network Simulator:** Topology integrity & packet loss test suites

### Reproduce Research Experiments

```bash
# Run all experiments (E3 Localizer, E5 RTO Timers, E6 Policy Shield)
python tools/campusctl.py exp all

# Or run a rapid preview of the E3 Localizer
python tools/campusctl.py exp e3 --quick
```

---

## 🌍 GitHub Pages Deployment Details

The frontend of CampusConnect v2 is continuously deployed to **GitHub Pages**:
🔗 **Live URL:** [https://007arnav007.github.io/CampusConnect/](https://007arnav007.github.io/CampusConnect/)

### How Client-Side Routing Works on GitHub Pages
Because GitHub Pages is a static file host, navigating directly to subroutes (e.g. `/CampusConnect/academics` or `/CampusConnect/lab`) would normally cause a 404 error.

CampusConnect solves this via a custom SPA redirect technique:
1. `public/404.html` catches any unmatched route request and preserves the destination path and query string in `sessionStorage`.
2. It redirects immediately to the root `/CampusConnect/index.html`.
3. `index.html` restores the original URL before `react-router` mounts, ensuring seamless deep-linking to all tabs without requiring a server-side rewrite engine.

---

## 📁 Repository Structure

```
CampusConnect/
├── .github/                      # GitHub Actions CI/CD workflows & pages deploy
├── ai-service/                   # Node.js Grounded RAG Knowledge Assistant
│   ├── src/                      # Embeddings, retrieval, and prompt guardrails
│   └── knowledge-base/           # Campus policies, syllabus guides, and FAQ docs
├── backend/                      # Spring Boot 3.5 Java Backend
│   ├── src/main/java/            # Controllers, Services, Security, Repositories
│   └── pom.xml                   # Maven dependencies and build targets
├── docs/                         # In-depth architectural & research documentation
│   ├── PROTOCOL.md               # Detailed Protocol v2 RFC specification
│   ├── RESULTS.md                # Full empirical experiment results with CIs
│   ├── STATUS.md                 # Complete capability & component maturity matrix
│   └── V2_SPEC.md                # System specification & mathematical proofs
├── emergency-receiver/           # Protocol v2 UDP/TCP Receiver
│   ├── src/                      # Replay bitmask, HMAC validator, SQLite WAL engine
│   └── tests/                    # Protocol fuzzing & receipt validation tests
├── experiments/                  # Research experiments & benchmark generators
│   ├── e3_localizer.py           # E3 Fault Localizer vs Baseline benchmark
│   ├── e5_timers.py              # E5 Adaptive RTO timer race evaluation
│   ├── e6_policy.py              # E6 Conformal policy selector evaluation
│   └── independent_eval.py       # Independent 38-node generator (circularity test)
├── frontend/                     # React 19 + Vite 7 + Tailwind 4 Client
│   ├── src/
│   │   ├── components/           # Reusable UI cards, tables, navigation bars
│   │   ├── pages/                # Academics, Lab, Dashboard, Tickets, Admin
│   │   └── lab/                  # Gilbert-Elliott, RTO, and Replay interactive sims
│   └── public/                   # Static assets & 404.html SPA router
├── gateway/                      # Node.js 22 Express API Gateway & WebSocket hub
├── ml-service/                   # Python 3.11 FastAPI Bayesian Fault Engine
│   ├── src/
│   │   ├── localize_api.py       # REST API endpoints & surge heuristic guard
│   │   └── localizer.py          # Bayesian posterior & conformal prediction logic
│   └── tests/                    # Pytest test suites
├── network-simulator/            # Synthetic network topology & fault injectors
├── protocol/                     # Protocol v2 TypeScript core library
│   ├── src/
│   │   ├── canonical_json.ts     # RFC 8785 deterministic JSON canonicalizer
│   │   ├── envelope.ts           # HMAC-SHA256 signer and verifier
│   │   ├── framing.ts            # Length-prefixed TCP streaming codec
│   │   └── replay_window.ts      # 64-bit anti-replay sliding bitmask
├── tools/
│   └── campusctl.py              # Unified CLI for doctor, env-init, test, and exp
├── docker-compose.yml            # Multi-service container orchestration
├── PROJECT_ANALYSIS_AND_REVIEW.md# Exhaustive critical evaluation & technical review
└── README.md                     # You are here!
```

---

## ⚖️ Honest Research Disclosures & Known Limitations

In the interest of scientific rigor and transparent academic evaluation, the following constraints and known limitations are explicitly documented:

1. **Synthetic Network Topology:**  
   The primary 97-node campus topology is generated based on real-world university topologies (`topology/campus.yaml`), but remains synthetic. While our independent 38-node generator confirmed high out-of-distribution accuracy (95.9% Top-1), production validation requires physical SNMP/Syslog feeds from live Cisco/Aruba hardware.
2. **Operational Surge False Alarms:**  
   When a massive crowd gathers in an auditorium, Wi-Fi traffic surges naturally, causing latency and minor packet drops. The Bayesian model legitimately scores these APs highly. Our 5-condition heuristic guard (`check_operational_surge`) suppresses ~55% of benign crowd alarms, but residual false alarms remain during non-standard surge events.
3. **Conformal Coverage under Severe MNAR:**  
   Split-conformal prediction relies on data exchangeability. When a failure switches from standard random degradation (MCAR) to complete silent failure (MNAR), exchangeability is partially violated, causing realized coverage to drop from the theoretical 95% down to ~64%.
4. **Network Emulation Environment:**  
   The spaced UDP copy benchmarks were executed using Linux virtual network namespaces with `tc netem` in WSL2, which closely mirrors physical links but lacks the variable RF multi-path interference of real 802.11ax hardware.
5. **HMAC Key Rotation:**  
   The current prototype uses a static key identified by `keyId: "k1"`. A production deployment should implement an automated dual-key rotation ring.

---

## 🔮 Future Roadmap

* [ ] **Physical SNMP / Syslog Collector:** Real-time log ingestion agent for physical campus switches.
* [ ] **Trained Surge Classifier:** Replace the heuristic surge guard with a small gradient-boosted tree (XGBoost) trained on multi-building temporal traffic features.
* [ ] **Hardware Testbed:** Physical multi-node validation using Raspberry Pi 4 nodes transmitting Protocol v2 datagrams across real congested Wi-Fi channels.
* [ ] **Dynamic Topology Visualizer:** Interactive canvas rendering real-time packet transit animations and live link load indicators.

---

## 👥 Authors & Academic Context

* **Project:** CampusConnect v2  
* **Course:** Computer Networks & Telecommunications (CNT501)  
* **Institution:** Vellore Institute of Technology (VIT)  
* **Lead Developer:** Arnav ([@007Arnav007](https://github.com/007Arnav007))  
* **Live Deployment:** [https://007arnav007.github.io/CampusConnect/](https://007arnav007.github.io/CampusConnect/)
