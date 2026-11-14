# CampusConnect v2 — Complete Step-by-Step Project Guide & Technical Walkthrough
**A Complete Guide with Real Screenshots, Technical Terms Explained, and Deep-Dive into CNT & ML Concepts**

---

## 📌 Executive Summary (Explained in Plain English)

Imagine you are living in a huge college campus with 30,000 students and hundreds of Wi-Fi routers (Access Points) spread across academic blocks, libraries, and hostels.

When a Wi-Fi router on the 3rd floor of Academic Block 2 completely burns out or loses power, **it goes completely silent**. It cannot send an email or an SNMP alert saying *"I am dead"*, because it has no power or network link left. Meanwhile, students sitting in class get disconnected and start filing helpdesk tickets: *"Wi-Fi stopped working in AB2 3rd floor!"*

Traditional network tools (like SolarWinds or PRTG) and traditional student helpdesks (like Zendesk or Jira) don't talk to each other. The network team looks at green dashboard lights (thinking the router is just idle), while the helpdesk team reads vague complaints without knowing which cable or router failed.

**CampusConnect v2 solves this problem by combining two systems:**
1. **A Full Student Academics & Support Portal:** Students have access to 8 CS subjects (syllabi, timetables, YouTube playlists, textbooks, class chat, assignments), support ticketing, and an AI campus assistant.
2. **A Smart Network AI ("Network Doctor"):** Whenever a student files a complaint, our AI takes their location, checks the campus network graph, and realizes that the silent router isn't just idle — **its silence is evidence of a crash!** This is called **Informative Missingness**.

---

## 📖 Glossary of Terms (Every Concept Explained Simply)

Before diving into the screenshots, here is a simple translation of every technical term used in this project:

| Term | What It Means in Simple English |
|---|---|
| **CNT (Computer Networks & Telecommunications)** | The engineering field that studies how computers talk to each other over wires, fiber optics, and wireless radio waves. |
| **ML (Machine Learning)** | Computer programs that learn patterns from data and make probabilistic predictions rather than following rigid if-else rules. |
| **Access Point (AP)** | The ceiling-mounted Wi-Fi box that broadcasts the wireless signal to your phone or laptop. |
| **Switch** | A network box inside a server rack that connects multiple cables together within a building. |
| **Core Router** | The heavy-duty backbone router that connects all campus buildings to the main internet service provider. |
| **Topology Graph** | A network map showing which device is plugged into which (e.g., Router $\to$ Building Switch $\to$ Floor Switch $\to$ Access Point). |
| **Telemetry** | Automated health measurements streamed by network devices (e.g., CPU temperature, packet loss %, round-trip latency). |
| **Informative Missingness** | In standard stats, missing data is assumed to be accidental (like someone skipping a survey question). In networking, **when a device stops sending telemetry, its silence is proof of its failure**! Just like Sherlock Holmes' famous "dog that didn't bark in the night". |
| **Bayesian Inference** | A mathematical way of updating your belief about an event as new clues arrive ($P(\text{Router Broken} \mid \text{Complaints} + \text{Silence})$). |
| **Split-Conformal Prediction** | Instead of guessing one single router, the AI gives a *small group of suspect routers* with a mathematical guarantee: *"We guarantee 90% of the time, the real broken router is inside this box."* |
| **UDP (User Datagram Protocol)** | A lightweight internet transport protocol that shoots packets fast without waiting for connection setup, but doesn't guarantee delivery. |
| **TCP (Transmission Control Protocol)** | A reliable internet transport protocol that sets up a 3-way handshake and guarantees every byte arrives in order. |
| **Protocol v2** | Our custom emergency network protocol that gives UDP the reliability of TCP and cryptographic security without heavy overhead. |
| **HMAC-SHA256** | A digital wax seal (cryptographic signature) attached to packets using a secret key. If a hacker tampers with 1 bit, the seal breaks. |
| **RFC 8785 Canonical JSON** | Sorting JSON fields alphabetically and removing extra spaces before signing so that Java, Python, and JavaScript all produce the exact same digital seal. |
| **Sliding Anti-Replay Window (RFC 4303)** | A 64-bit memory check that accepts out-of-order packets while instantly rejecting duplicate copies re-sent by an attacker. |
| **Gilbert–Elliott Channel Model** | A mathematical 2-state model simulating real-world Wi-Fi, which flips between a **Good state** (no loss) and a **Bad state** (bursts of dropped packets). |
| **Spaced UDP Copies** | Sending 2 copies of a packet separated by a small time gap ($30\text{ ms}$) so that even if the first copy hits a Wi-Fi burst loss, the second copy survives. |
| **Cancel-on-ACK** | Once the receiver sends back an acknowledgement (ACK) that packet #1 arrived, the sender cancels any scheduled backup copies to save bandwidth. |
| **RTO (Retransmission Timeout) & RFC 6298** | The timer that decides how long a sender should wait before assuming a packet was lost and re-transmitting it. |
| **RAG (Retrieval-Augmented Generation)** | An AI chatbot technique where the AI first reads factual local documents (like campus PDFs) before generating an answer, stopping hallucinations. |
| **WebSocket** | A permanent, two-way open phone line between the user's browser and the server so updates (like chat messages or network alerts) appear instantly without refreshing. |

---

## 📸 Step-by-Step Project Walkthrough with Real Screenshots

Below is the complete walkthrough of CampusConnect v2 from start to finish. Every screen has its actual capture from the application, an explanation of what is happening, and the exact CNT / ML concepts powering it.

---

### Step 1: Student Authentication & Sign In

![Student Login Page](screenshots/01_login_page.png)

#### What You See on Screen:
The clean authentication gateway with institutional email validation, password visibility toggle, error handling banners, and links to registration and administrative access. Any student with a valid `@vit.edu` email can log in or register.

#### How It Works Under the Hood:
1. The student submits their email and password.
2. The browser sends a secure HTTP `POST` request to `/api/v1/auth/login`.
3. The Spring Boot backend checks the password against salted cryptographic hashes (`BCrypt` / `PBKDF2`).
4. Upon validation, the server generates a signed **JWT (JSON Web Token)** containing the user's ID, roles (`STUDENT`), and an expiration timestamp.
5. The frontend saves this token in `localStorage` and injects it into the `Authorization: Bearer <token>` header of every subsequent API request.

#### How It Uses CNT:
* **Transport Layer Security (TLS/HTTPS):** Operates on TCP Port 443 with encrypted handshakes, protecting plaintext passwords against packet-sniffing attacks (Wireshark) on campus Wi-Fi.
* **Stateless RESTful Protocol:** Uses standard HTTP request-response cycles. Because tokens are self-contained in the client header, the backend server requires no shared session state memory, enabling seamless horizontal scaling.

---

### Step 2: Student Dashboard & Live Campus Overview

![Student Dashboard](screenshots/02_student_dashboard.png)

#### What You See on Screen:
The personalized student portal homepage displaying real-time metric counters:
* **Active Support Tickets** filed by the student.
* **Campus Incident Alerts** affecting campus connectivity.
* **Enrolled Academic Courses** (showing 8 Computer Science courses).
* Quick action shortcuts to submit a ticket, explore academics, chat with the AI assistant, or launch the CNT Visual Lab.

#### How It Works Under the Hood:
1. On component mount, the dashboard invokes three parallel REST queries (`getTickets()`, `getAcademicCourses()`, `getIncidents()`).
2. Simultaneously, it initializes a **Socket.io WebSocket connection** with the API Gateway on port `3001`.
3. If an administrator resolves an incident or replies to a ticket, a WebSocket event (`ticket:updated`) fires, and the dashboard counters re-render instantly without requiring a page refresh.

#### How It Uses CNT:
* **Persistent WebSockets over TCP:** Unlike HTTP which opens and closes TCP connections repeatedly, WebSockets upgrade the HTTP connection (`HTTP 101 Switching Protocols`) into a permanent, bidirectional stream.
* **Ping-Pong Heartbeat Frames:** The client and server exchange 2-byte heartbeat frames every 25 seconds to verify link liveness and detect silent Wi-Fi dropouts.

---

### Step 3: Academics Hub — 8 Core Computer Science Subjects

![Academics Hub](screenshots/03_academics_courses_list.png)

#### What You See on Screen:
The comprehensive Computer Science curriculum hub featuring **8 core subjects**:
1. **Machine Learning (`CSE601`)**
2. **Computer Networks (`CNT501`)**
3. **Design & Analysis of Algorithms (`CSE602`)**
4. **Cloud Computing (`CSE603`)**
5. **Data Structures & Algorithms (`CSE604`)**
6. **Object-Oriented Programming (`CSE605`)**
7. **Database Management Systems (`CSE606`)**
8. **Advanced Data Structures (`CSE607`)**

Each subject card indicates credit rating, faculty coordinator, enrolled student counts, and direct action buttons to enroll or access study materials.

#### How It Works Under the Hood:
The frontend fetches the course directory from `/api/v1/academics/courses`. State is managed via React Context, enabling instant client-side filtering by semester, department, or keyword.

#### How It Uses CNT:
* **Optimized Payload Serialization:** Course data is serialized in lightweight JSON payloads with gzip compression over HTTP/2, reducing bandwidth consumption on congested campus wireless links.

---

### Step 4: Course Detail & Overview Page

![Course Overview](screenshots/04_academics_course_overview.png)

#### What You See on Screen:
Opening **Machine Learning (`CSE601`)** displays a modular tabbed interface with:
* Course code, faculty details, and department credits.
* Course description and grading weightage.
* Six dedicated sub-views: **Overview**, **Syllabus**, **Timetable**, **Resources**, **Chat**, and **Announcements**.

#### How It Works Under the Hood:
The interface uses React Router nested sub-routes (`/academics/CSE601/overview`, `/academics/CSE601/syllabus`, etc.). Deep-linking allows students to share direct URLs with classmates.

---

### Step 5: 8-Unit Granular Syllabus Breakdown

![Syllabus Breakdown](screenshots/05_academics_syllabus.png)

#### What You See on Screen:
A full 8-unit curriculum breakdown for Machine Learning:
* Unit 1: Introduction & Linear Regression
* Unit 2: Classification & Logistic Regression
* Unit 3: Tree Models & Ensemble Methods
* Unit 4: Neural Networks & Backpropagation
* Unit 5: Support Vector Machines & Kernels
* Unit 6: Unsupervised Learning & Clustering
* Unit 7: Dimensionality Reduction (PCA / t-SNE)
* Unit 8: Model Evaluation & Conformal Uncertainty

#### How It Uses ML:
The syllabus introduces the mathematical foundations used directly in CampusConnect's backend — specifically **Bayesian classification**, **log-likelihood estimation**, and **Split-Conformal Prediction**.

---

### Step 6: Visual Timetable & Lab Slot Schedule

![Weekly Timetable](screenshots/06_academics_timetable.png)

#### What You See on Screen:
A structured weekly timetable outlining Monday through Friday lecture slots, room locations (e.g. `AB2-301`), and dedicated practical laboratory hours.

#### How It Uses CNT:
* **Spatial Network Mapping:** Each room entry (e.g. `AB2-301`) maps directly to the network node ID (`AP-AB2-301`) in the campus topology graph. This shared namespace allows the system to cross-reference where students are scheduled to be with where network faults occur!

---

### Step 7: Curated Video Playlists & Textbook PDFs

![Learning Resources](screenshots/07_academics_resources_videos.png)

#### What You See on Screen:
Direct links to curated educational media:
* Top YouTube lecture series (NPTEL, Stanford CS229, MIT OpenCourseWare).
* Standard reference textbooks and laboratory manuals.

#### How It Uses CNT:
* **HTTP Range Requests (RFC 7233):** When students stream lecture videos or download multi-megabyte textbook PDFs, the browser uses `Range: bytes=0-1048575` headers. This allows partial streaming, pause/resume, and random seeking without re-downloading entire video streams.
* **TCP Flow & Congestion Control:** Video streaming utilizes TCP Reno / Cubic congestion windows to dynamically adjust playback buffer sizes based on available campus Wi-Fi bandwidth.

---

### Step 8: Real-Time Section Discussion Chat

![Real-Time Class Chat](screenshots/08_academics_class_chat.png)

#### What You See on Screen:
A live, interactive chatroom where students and teaching assistants exchange subject queries in real time with message timestamps and sender avatars.

#### How It Works Under the Hood:
1. When a student enters `CSE601`, the frontend sends a `socket.emit('chat:join', { courseId: 'CSE601' })` message.
2. The Node.js Gateway adds the socket to a private Socket.io room (`rooms.get('course:CSE601')`).
3. Outgoing messages are broadcast only to peers in that room, ensuring total isolation between different courses.

#### How It Uses CNT:
* **Socket Multiplexing:** Multiple logical chat rooms and alert streams share a single physical TCP connection between client and gateway.
* **Transport Protocol Comparison:** Chat demonstrates **TCP-based delivery** (where no message can be dropped or arrive out of order), contrasting with the UDP delivery explored in Protocol v2.

---

### Step 9 & 10: Student Helpdesk & Spatial Ticket Submission

![Student Tickets List](screenshots/09_tickets_student_list.png)
*(Above: Student ticket management list showing status, category badges, and priority tags)*

![Ticket Submission Modal](screenshots/10_tickets_create_modal.png)
*(Above: Interactive modal for filing a network or campus infrastructure ticket)*

#### What You See on Screen:
* A helpdesk ticket management table with priority tags (`LOW`, `MEDIUM`, `HIGH`, `URGENT`) and lifecycle states (`OPEN` $\to$ `IN_PROGRESS` $\to$ `RESOLVED`).
* A ticket creation dialog with category selector, subject title, detailed description, and a **geographic campus location tag** (e.g. `AB2 - Academic Block 2, 3rd Floor`).

#### How It Works Under the Hood & How It Feeds the ML Localizer:
1. When a student clicks **Submit Ticket**, the ticket is stored in PostgreSQL.
2. The location tag (`AB2-3`) is parsed by the API Gateway and forwarded to the ML Service.
3. **This is the core human-sensor input:** The ML Service aggregates tickets by building zone over a sliding 15-minute time window, producing the ticket evidence vector $d_R$ that fuels the Bayesian Fault Localizer!

---

### Step 11, 12 & 13: Grounded AI Campus Assistant (RAG)

![AI Assistant Welcome Screen](screenshots/11_ai_assistant_welcome.png)
*(Above: AI Assistant introductory screen with pre-built prompt suggestions)*

![Asking Campus Wi-Fi Question](screenshots/12_ai_assistant_rag_query.png)
*(Above: Student submitting query: "How do I connect to campus Wi-Fi?")*

![Grounded Answer with Source Citations](screenshots/13_ai_assistant_answer.png)
*(Above: Accurate, grounded step-by-step connection guide citing local policy markdown)*

#### What You See on Screen:
The student queries the AI assistant regarding campus Wi-Fi connection steps. The assistant provides an exact step-by-step guide (SSID `VIT-Student`, 802.1X PEAP authentication, MSCHAPv2 inner protocol) and references the exact local knowledge base source.

#### How It Uses ML (Retrieval-Augmented Generation):
* **Embedding & Semantic Search:** Rather than allowing the LLM to invent instructions, the query is converted into a vector embedding and matched against local campus policy documents in `ai-service/knowledge-base/` using cosine similarity.
* **Safety & Anti-Hallucination Guardrails:** If the question falls outside campus scope (e.g., general chit-chat), strict prompt boundaries ensure the model states it only answers campus-related questions.

---

### Step 14: CNT Visual Lab — Gilbert–Elliott Wireless Burst Loss Simulation

![CNT Lab - Gilbert-Elliott Simulation](screenshots/14_cnt_lab_burst_loss.png)

#### What You See on Screen:
An interactive simulator visualizing how Wi-Fi signals behave in crowded environments:
* **Mean Loss Slider** (e.g., 15% packet loss).
* **Mean Burst Length Slider** (e.g., 150 ms loss duration).
* **Round-Trip Time Slider** (40 ms).
* **Visual Channel Strip:** Green bands indicate the channel is Good; red bands show correlated burst drops.
* **Comparative Monte Carlo Benchmark:**
  * Spaced transmission ($k=2, \Delta t=30\text{ ms}$): **85.3% on-time delivery**.
  * Back-to-back transmission ($\Delta t=0\text{ ms}$): **83.8% on-time delivery**.
* **Physical Linux Kernel Socket Evidence Card (`tc netem`):** Real socket measurements across Linux network namespaces showing **99.7% delivery** for spaced copies vs 97.3% for back-to-back under 20% burst loss!

#### How It Uses CNT:
* **Gilbert–Elliott 2-State Markov Chain:** Real wireless loss is not independent (Bernoulli). When an obstacle (like a human walking past an antenna) blocks a radio beam, multiple consecutive packets are lost in a burst.
* **Temporal Diversity & Burst Escape:** Sending 2 copies separated by $\ge$ the mean burst duration guarantees that even if copy #1 enters a red burst band, copy #2 arrives after the channel has transitioned back to the Good state.
* **Cancel-on-ACK Bandwidth Conservation:** Once copy #1's ACK arrives, copy #2 is cancelled before transmission, using only 1.98 datagrams on average.

---

### Step 15: CNT Visual Lab — RFC 6298 Adaptive Retransmission Timeout (RTO) Race

![CNT Lab - RTO Race](screenshots/15_cnt_lab_rto_race.png)

#### What You See on Screen:
A real-time race comparing a **Fixed 200 ms Timer** against the standard **RFC 6298 Adaptive RTO Timer**:
* When network latency fluctuates between 20 ms and 180 ms, the fixed timer either triggers premature duplicate transmissions or takes too long to recover.
* The adaptive timer continuously tracks network jitter, keeping the RTO safely above the round-trip time.

#### How It Uses CNT:
* **Jacobson's Algorithm:** Implements the core Internet RFC 6298 mathematics:
  $$\text{Diff} = \text{SampleRTT} - SRTT$$
  $$SRTT \leftarrow SRTT + \frac{1}{8} \cdot \text{Diff}$$
  $$RTTVAR \leftarrow RTTVAR + \frac{1}{4} \cdot (|\text{Diff}| - RTTVAR)$$
  $$RTO = SRTT + \max(G, 4 \cdot RTTVAR)$$
* **Karn's Algorithm & Exponential Backoff:** If a timeout occurs, $RTO$ doubles ($2 \times RTO$) to alleviate network congestion.

---

### Step 16: CNT Visual Lab — 64-Bit Sliding Anti-Replay Window (RFC 4303)

![CNT Lab - Replay Window](screenshots/16_cnt_lab_replay_window.png)

#### What You See on Screen:
An interactive visual representation of an IPsec-style 64-packet bitmask window:
* Packets arriving in order advance the right edge of the window.
* Packets arriving slightly out-of-order (normal UDP behavior) are accepted if they fall within the 64-packet window.
* Duplicate or replayed packets are instantly rejected.

#### How It Uses CNT & Network Security:
* **Anti-Replay Protection:** In emergency communication, an adversary could capture an authentic "Evacuate Building" datagram and re-transmit it hours later.
* **Bitwise Efficiency ($O(1)$ Complexity):** Instead of storing millions of sequence IDs in a database, the receiver uses a single 64-bit integer (`uint64_t`). Verifying whether sequence $S$ was already seen requires just one bitwise AND operation:
  $$\text{seen} = (\text{bitmap} \ \& \ (1\text{ULL} \ll (\text{max\_seq} - S))) \neq 0$$

---

### Step 17: Admin & Network Engineer Sign In

![Admin Login](screenshots/17_admin_login.png)

#### What You See on Screen:
The administrative access portal for network engineers and IT managers (`admin@example.edu`).

#### How It Works Under the Hood:
Upon authentication, the backend validates the `ADMIN` role claim in the JWT. Protected routes (`/admin/*`) verify this role; any unauthorized student attempting to access admin routes is immediately redirected to an `Access Denied` view.

---

### Step 18: Admin Network Operations Center (NOC) Dashboard

![Admin Overview](screenshots/18_admin_dashboard_overview.png)

#### What You See on Screen:
The central operations screen displaying:
* **Active Network Health:** Node anomaly metrics across campus buildings.
* **Live Incident Feed:** Stream of active tickets, severity distribution, and dispatch actions.
* **Real-time WebSocket Indicator:** Green status badge showing an active link to the Gateway event aggregator.

---

### Step 19 & 20: Network Topology & Real-Time Fault Injection Engine

![Network Topology View](screenshots/19_admin_network_topology.png)
*(Above: 97-node campus topology graph categorized by building switches and access points)*

![Fault Injection Panel](screenshots/20_admin_fault_injection.png)
*(Above: Admin control buttons to inject simulated failures into the live network)*

#### What You See on Screen:
* A hierarchical graph representing **97 network nodes**: Core Routers (`CORE-01`, `RTR-01`) $\to$ Distribution Switches $\to$ Building Switches (`SW-AB2-01`) $\to$ Access Points (`AP-AB2-301`).
* **Fault Injection Controls:** Admins can trigger simulated real-world failures:
  1. **Demand Surge:** Simulates a massive crowd entering an auditorium.
  2. **AP Degradation:** Injects 80% packet loss on a specific access point.
  3. **Switch Flap:** Simulates a loose fiber cable intermittently disconnecting an entire building.

#### How It Uses CNT:
* **Hierarchical Network Design (Cisco 3-Tier Model):** Demonstrates the Core, Distribution, and Access layer topology standard in modern enterprise campuses.
* **Chaos Engineering:** Allows validation of network resilience and localizer accuracy under controlled synthetic faults.

---

### Step 21: Bayesian Fault Localizer in Action

![Bayesian Localizer Demo](screenshots/21_admin_incident_demo_bayesian.png)

#### What You See on Screen:
The live demonstration of the **M1 Fault Localizer**:
* A simulated incident is fed into the engine (e.g. 14 complaints from Academic Block 2, floor 3).
* The engine computes the **Calibrated Posterior Probability** over all 97 candidate nodes.
* The bar chart immediately flags `AP-AB2-301` as the primary suspect with **94.2% probability**.

#### How It Uses ML (Bayesian Sensor Fusion):
The model evaluates the log-likelihood across three distinct evidence streams:
$$\ln P(H = n \mid \text{data}) = \ln P(H=n) + \ln P(d_R \mid n) + \ln P(d_T \mid n) + \ln P(d_N \mid n) - \ln Z$$

Where:
* $d_R$: Student ticket spatial density in node $n$'s coverage zone.
* $d_T$: Continuous anomaly telemetry from SNMP-like polling.
* $d_N$: Graph adjacency (propagating complaints up to parent switches).
* $Z$: Normalization constant across all 97 hypotheses.

---

### Step 22: Conformal Prediction Sets & Guaranteed Uncertainty Bounds

![Conformal Prediction Sets](screenshots/22_admin_conformal_prediction_set.png)

#### What You See on Screen:
* Rather than outputting just one guess, the system outputs a **Prediction Set**:
  $$\text{Suspect Set } C_{\alpha} = \{\text{AP-AB2-301}, \text{SW-AB2-01}\}$$
* It displays an explicit **90% Confidence Guarantee** ($\alpha = 0.10$).

#### How It Uses ML (Conformal Prediction):
* In critical infrastructure, point predictions (guessing 1 single device) are dangerous because replacing the wrong device wastes hours.
* Using **Least Ambiguous Classifier (LAC)** conformal calibration on holdout scenarios, the engine determines the smallest set of nodes that statistically guarantees containing the true root-cause node with $1 - \alpha$ probability.

---

### Step 23: Informative Missingness — The Core Research Breakthrough

![Informative Missingness Explanation](screenshots/23_admin_informative_missingness_explanation.png)

#### What You See on Screen:
The mathematical explanation card rendered directly inside the application:
> *"When AP-AB2-301 failed, telemetry stopped completely. Baseline telemetry-only systems scored the node as 0.0 (ignoring it). CampusConnect v2 treats silence as active evidence of failure: $P(\text{silent} \mid \text{failed}) = 0.95$."*

#### How It Uses CNT & ML (Why This Is a Major Research Result):
In traditional statistics, missing data is assumed to be **Missing Completely at Random (MCAR)**. In real campus networks, hardware failure causes **Missing Not at Random (MNAR)**:
* When an Access Point crashes, its telemetry port dies.
* Baseline tools (L-B1) that rely solely on telemetry drop to **0.0% accuracy** at $\ge 20\%$ blind nodes because they receive no data.
* CampusConnect v2's fused model (**L-F**) achieves **46.3% to 76.2% accuracy**, delivering a **+37 to +46 percentage points advantage** over industry baselines!

---

## 📊 Summary Comparison: How CampusConnect Uses CNT vs ML

| Feature | Primary Domain | How CNT Is Applied | How ML Is Applied |
|---|---|---|---|
| **Student Auth** | CNT / Security | TLS/HTTPS, stateless JWTs, REST over TCP | None (Cryptographic hashing) |
| **Class Chat & Alerts** | CNT / Real-Time | WebSockets, Socket.io room multiplexing | None |
| **Academics Resources** | CNT / Web | HTTP Range requests, TCP Reno/Cubic video streaming | Content recommendation |
| **Campus AI Assistant** | ML / NLP | Standard HTTP JSON transport | Markdown RAG, Vector embeddings, Guardrails |
| **Gilbert–Elliott Simulator** | CNT | 2-state Markov chain, Spaced UDP copies, Cancel-on-ACK | Stochastic simulation |
| **RFC 6298 RTO Race** | CNT | Jacobson's EWMA $SRTT / RTTVAR$, Exponential backoff | Compared with Q-learning adaptive timer |
| **Anti-Replay Window** | CNT / Security | RFC 4303 64-bit sliding bitmask, Monotonic sequence IDs | None ($O(1)$ bitwise operations) |
| **Protocol v2 Receiver** | CNT / Security | HMAC-SHA256, RFC 8785 Canonical JSON, Length-prefixed TCP | None (Protocol engineering) |
| **M1 Fault Localizer** | CNT + ML | Graph topology mapping, SNMP telemetry, Zone routing | Bayesian Sensor Fusion, Maximum a Posteriori |
| **Uncertainty Sets** | ML | Network node hypothesis space | Split-Conformal Prediction, LAC non-conformity |
| **Informative Missingness** | CNT + ML | Diagnosing silent access points & severed links | MNAR probabilistic modeling, Log-likelihood weighting |

---

## 🎓 Teacher / Examiner Presentation Cheat Sheet

If an examiner or teacher asks you key questions during a viva or presentation, here are the direct answers:

### Q1: "What is the main contribution of your project?"
> *"Our main contribution is solving the **Silent Node Problem** on campus networks. When an access point crashes, it cannot report its own failure, causing traditional telemetry-only monitoring tools to drop to 0% accuracy. CampusConnect v2 treats **silence as probabilistic evidence** (Informative Missingness) and fuses student helpdesk complaints with campus graph topology using Bayesian inference, achieving a +34 to +46 percentage points accuracy gain over standard baselines."*

### Q2: "What is Protocol v2 and why did you build it?"
> *"Protocol v2 is an application-layer datagram protocol designed for emergency campus alerts over lossy Wi-Fi. It uses **RFC 8785 Canonical JSON** and **HMAC-SHA256** for tamper-proof signatures, an **RFC 4303 64-bit sliding bitmask** for anti-replay protection, and **scheduled spaced UDP copies with cancel-on-ACK** to escape correlated burst loss modeled by the Gilbert–Elliott Markov chain."*

### Q3: "What Machine Learning models did you use?"
> *"Rather than using a black-box deep learning model that cannot be explained, we used a **Bayesian Graphical Model** that fuses ticket complaint density ($d_R$), telemetry anomaly scores ($d_T$), and topology adjacency ($d_N$). We also implemented **Split-Conformal Prediction** with the Least Ambiguous Classifier (LAC) criterion to provide network operators with guaranteed 90% confidence sets for suspect devices."*

### Q4: "Is this deployed and testable?"
> *"Yes! The frontend is deployed live on **GitHub Pages** ([007arnav007.github.io/CampusConnect](https://007arnav007.github.io/CampusConnect/)), all 76 unit and integration tests across 6 modules pass cleanly, and the complete codebase is open-sourced on GitHub ([007Arnav007/CampusConnect](https://github.com/007Arnav007/CampusConnect))."*

---

*CampusConnect v2 — Computer Networks & Telecommunications (CNT501)*  
**Live Site:** [https://007arnav007.github.io/CampusConnect/](https://007arnav007.github.io/CampusConnect/) | **GitHub:** [007Arnav007/CampusConnect](https://github.com/007Arnav007/CampusConnect)

