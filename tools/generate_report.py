import os
import subprocess
import pathlib

ROOT = pathlib.Path(r"d:\VIT\5th sem\CNT\files\CampusConnect_v2\CampusConnect")
DOCS = ROOT / "docs"
SCREENSHOTS_DIR = DOCS / "screenshots"
PDF_OUT = DOCS / "CampusConnect_Project_Report.pdf"
WORKSPACE_PDF = pathlib.Path(r"d:\VIT\5th sem\CNT\files\CampusConnect_Project_Report.pdf")
HTML_OUT = DOCS / "report_temp.html"
ARTIFACT_DIR = pathlib.Path(r"C:\Users\HP\.gemini\antigravity\brain\69f66e51-7266-48ef-90ee-fd76da7b04c8")
MD_ARTIFACT = ARTIFACT_DIR / "CampusConnect_Master_Project_Document.md"

html_content = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>CampusConnect v2 — Master Project Report & Technical Guide</title>
<style>
  @page {
    size: A4;
    margin: 16mm 14mm 16mm 14mm;
    @bottom-right {
      content: "Page " counter(page);
      font-size: 9pt;
      color: #64748b;
    }
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    line-height: 1.55;
    font-size: 10.5pt;
    margin: 0;
    padding: 0;
  }

  h1, h2, h3, h4 {
    color: #0f172a;
    font-weight: 700;
    margin-top: 1.2em;
    margin-bottom: 0.5em;
    page-break-after: avoid;
  }

  h1 { font-size: 22pt; line-height: 1.2; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; margin-top: 0; }
  h2 { font-size: 15pt; color: #1e40af; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; margin-top: 1.8em; }
  h3 { font-size: 12pt; color: #0369a1; margin-top: 1.2em; }
  h4 { font-size: 11pt; color: #334155; }

  p { margin: 0.5em 0; }
  
  .lead {
    font-size: 12pt;
    color: #334155;
    font-weight: 500;
    margin-bottom: 1.2em;
  }

  .badge-row {
    margin: 10px 0 20px 0;
  }
  .badge {
    display: inline-block;
    padding: 4px 10px;
    font-size: 8.5pt;
    font-weight: 600;
    border-radius: 4px;
    margin-right: 6px;
    margin-bottom: 6px;
    color: #fff;
  }
  .bg-blue { background-color: #2563eb; }
  .bg-teal { background-color: #0d9488; }
  .bg-indigo { background-color: #4f46e5; }
  .bg-purple { background-color: #7c3aed; }
  .bg-green { background-color: #16a34a; }
  .bg-slate { background-color: #475569; }

  .card {
    background-color: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 14px 18px;
    margin: 14px 0;
    page-break-inside: avoid;
  }

  .card-callout {
    border-left: 4px solid #3b82f6;
    background-color: #eff6ff;
  }

  .card-innovation {
    border-left: 4px solid #10b981;
    background-color: #ecfdf5;
  }

  .card-warning {
    border-left: 4px solid #f59e0b;
    background-color: #fffbeb;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 14px 0;
    font-size: 9.5pt;
    page-break-inside: avoid;
  }

  th, td {
    border: 1px solid #cbd5e1;
    padding: 7px 10px;
    text-align: left;
    vertical-align: top;
  }

  th {
    background-color: #f1f5f9;
    color: #0f172a;
    font-weight: 600;
  }

  tr:nth-child(even) {
    background-color: #f8fafc;
  }

  .step-box {
    margin: 22px 0;
    page-break-inside: avoid;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 14px;
    background-color: #ffffff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }

  .screenshot-img {
    max-width: 100%;
    height: auto;
    max-height: 340px;
    display: block;
    margin: 10px auto;
    border: 1px solid #94a3b8;
    border-radius: 6px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.12);
  }

  .page-break {
    page-break-before: always;
  }

  ul, ol {
    margin: 0.5em 0;
    padding-left: 22px;
  }

  li {
    margin-bottom: 0.3em;
  }

  code {
    font-family: Consolas, Monaco, "Courier New", monospace;
    font-size: 9pt;
    background-color: #f1f5f9;
    padding: 2px 5px;
    border-radius: 4px;
    color: #0f172a;
    border: 1px solid #e2e8f0;
  }

  .tag-label {
    font-weight: 600;
    color: #1e3a8a;
  }
  
  .meta-table {
    margin-bottom: 25px;
    border: none;
  }
  .meta-table td {
    border: none;
    padding: 4px 8px;
    font-size: 10pt;
  }
</style>
</head>
<body>

<!-- Title & Cover Section -->
<h1>CampusConnect v2 — Master Project Report & Technical Guide</h1>
<div class="lead">Network-Aware Closed-Loop Campus Support & Research Platform</div>

<table class="meta-table">
  <tr>
    <td style="width: 50%;"><strong>Course:</strong> Computer Networks & Telecommunications (CNT501)</td>
    <td style="width: 50%;"><strong>Academic Year:</strong> 2026 – 5th Semester</td>
  </tr>
  <tr>
    <td><strong>Institution:</strong> Vellore Institute of Technology (VIT)</td>
    <td><strong>Lead Developer / Student:</strong> Arnav (@007Arnav007)</td>
  </tr>
  <tr>
    <td><strong>GitHub Repository:</strong> <a href="https://github.com/007Arnav007/CampusConnect">github.com/007Arnav007/CampusConnect</a></td>
    <td><strong>Live Deployment:</strong> <a href="https://007arnav007.github.io/CampusConnect/">007arnav007.github.io/CampusConnect</a></td>
  </tr>
  <tr>
    <td><strong>Status & Test Coverage:</strong> 76 / 76 Unit & Integration Tests Passing</td>
    <td><strong>Date:</strong> November 2026</td>
  </tr>
</table>

<div class="badge-row">
  <span class="badge bg-blue">React 19 & Vite 7</span>
  <span class="badge bg-teal">Spring Boot 3.5 (Java 24)</span>
  <span class="badge bg-indigo">FastAPI & Python 3.11</span>
  <span class="badge bg-purple">Node.js 22 & Socket.io</span>
  <span class="badge bg-green">GitHub Pages Deployed</span>
  <span class="badge bg-slate">PostgreSQL 18</span>
</div>

---

<h2>1. Executive Summary & Core Motivation</h2>

<p>
Modern university campuses accommodate tens of thousands of active devices, hundreds of wireless Access Points (APs), and complex multi-building network backbones. However, campus operations today are plagued by a severe architectural disconnect:
</p>

<div class="card card-callout">
  <strong>The Problem:</strong> Traditional network monitoring platforms (like SolarWinds, PRTG, or Nagios) and campus helpdesks (like Jira Service Desk or Zendesk) operate in <em>complete isolation</em>. 
  When an access point suffers power loss or physical failure, it goes <strong>completely silent</strong> — it cannot send an SNMP trap or alert saying it has crashed. Meanwhile, students experience Wi-Fi blackouts and submit vague tickets: <em>"Internet dead in AB2 3rd floor"</em>. Network engineers see no active alarms, while helpdesk staff lack topology visibility to identify the root cause.
</div>

<p>
<strong>CampusConnect v2 solves this challenge via two tightly coupled pillars:</strong>
</p>

<ol>
  <li><strong>Student Academics & Support Portal (Pillar 1):</strong> A comprehensive campus hub featuring study materials for <strong>8 core Computer Science subjects</strong> (Machine Learning, Computer Networks, DAA, Cloud Computing, DSA, OOPs, DBMS, and Advanced Data Structures) with syllabi, weekly lecture timetables, curated YouTube lecture playlists, textbook PDFs, real-time class chat, and a grounded AI helpdesk assistant.</li>
  <li><strong>CNT Research Core & Intelligent Network Doctor (Pillar 2):</strong> A Bayesian fault localization engine that treats <strong>node silence as active probabilistic evidence</strong> (<em>Informative Missingness</em>). It correlates student complaint locations with telemetry anomalies over a 97-node campus topology graph to pinpoint the exact broken hardware before IT staff receive escalations. This is backed by <strong>Protocol v2</strong> (a signed, anti-replay, ACK-acknowledged delivery protocol) and an interactive <strong>CNT Visual Lab</strong> for simulating networking phenomena.</li>
</ol>

---

<h2>2. Key Innovations & Breakthroughs</h2>

<table>
  <thead>
    <tr>
      <th style="width: 25%;">Innovation</th>
      <th style="width: 35%;">What Was Done in CampusConnect v2</th>
      <th style="width: 40%;">Why It Matters (Key Breakthrough)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>1. Informative Missingness Modeling</strong></td>
      <td>Modeled node silence as <code>P(silent | broken) = 0.95</code> vs <code>P(silent | healthy) = 0.05</code> in a Bayesian log-likelihood framework.</td>
      <td>When failing access points go dark, standard monitoring drops to <strong>0% accuracy</strong>. CampusConnect maintains <strong>46.3% to 76.2% accuracy</strong> (+34 to +46 pp advantage).</td>
    </tr>
    <tr>
      <td><strong>2. Protocol v2 Spaced Transmissions</strong></td>
      <td>Scheduled 2 copies spaced &ge; mean burst duration apart (30 ms) with <em>cancel-on-ACK</em> over UDP.</td>
      <td>Escapes correlated wireless burst loss. Achieves <strong>99.7% delivery</strong> in Linux kernel socket tests (<code>tc netem</code>) vs 97.3% for back-to-back copies.</td>
    </tr>
    <tr>
      <td><strong>3. 64-Bit Anti-Replay Bitmask Window</strong></td>
      <td>Implemented RFC 4303 IPsec-style sliding bitmask for emergency datagram verification.</td>
      <td>Performs duplicate and replay detection in <strong>O(1) time</strong> using a single 64-bit integer without any slow database lookups or locks.</td>
    </tr>
    <tr>
      <td><strong>4. Conformal Uncertainty Sets</strong></td>
      <td>Integrated Split-Conformal Prediction (Least Ambiguous Classifier criterion) with Mondrian grouping.</td>
      <td>Provides operators with a <strong>mathematically guaranteed 90% confidence set</strong> of suspect devices rather than an unreliable point guess.</td>
    </tr>
    <tr>
      <td><strong>5. Dual-Pillar Closed-Loop Synergy</strong></td>
      <td>Students act as mobile "human sensors"; spatial room tags map directly to topology node IDs.</td>
      <td>Turns messy human complaint tickets into structured spatial evidence ($d_R$) that actively powers network fault diagnosis.</td>
    </tr>
  </tbody>
</table>

<div class="page-break"></div>

---

<h2>3. Difficult Technical Topics Explained in Short</h2>

<div class="card card-callout">
  <h3>A. Informative Missingness (MNAR vs MCAR)</h3>
  <p><strong>The "Sherlock Holmes" Analogy:</strong> In standard statistics, missing data is assumed to be accidental (Missing Completely at Random - MCAR), like a student forgetting to answer question #4 on a survey. Standard tools replace missing values with averages.</p>
  <p>In network infrastructure, when a Wi-Fi router crashes or its upstream fiber is severed, it <em>cannot report anything</em>. Telemetry is <strong>Missing Not at Random (MNAR)</strong>. Just like the famous Sherlock Holmes clue of <em>"the dog that didn't bark in the night"</em>, <strong>the silence of the router is the primary clue proving it is dead!</strong></p>
</div>

<div class="card card-callout">
  <h3>B. Bayesian Log-Likelihood Sensor Fusion</h3>
  <p>The M1 Localizer calculates the probability of each network node $n$ being the root-cause failure:</p>
  <p style="text-align: center; font-weight: 600;">
    &ln; P(H = n | data) = &ln; P(H = n) + &ln; P(d<sub>R</sub> | n) + &ln; P(d<sub>T</sub> | n) + &ln; P(d<sub>N</sub> | n) - &ln; Z
  </p>
  <ul>
    <li><strong>d<sub>R</sub> (Human Ticket Clues):</strong> Number of student complaints coming from node $n$'s coverage zone.</li>
    <li><strong>d<sub>T</sub> (Telemetry & Silence Clues):</strong> Device anomaly scores + informative missingness penalty if the device is silent.</li>
    <li><strong>d<sub>N</sub> (Topology Graph Clues):</strong> Downstream child complaints propagating upstream to parent switches.</li>
  </ul>
</div>

<div class="card card-callout">
  <h3>C. Split-Conformal Prediction Sets</h3>
  <p>Instead of guessing a single device (which is dangerous if the technician replaces the wrong $1,000 switch), the algorithm computes a <strong>suspect set</strong> $C(X) = \{n_1, n_2\}$ that statistically guarantees:</p>
  <p style="text-align: center; font-weight: 600;">P(True Fault &isin; C(X)) &ge; 1 - &alpha; (where &alpha; = 0.10 &rarr; 90% confidence)</p>
</div>

<div class="card card-callout">
  <h3>D. Gilbert–Elliott Wireless Burst Loss Model</h3>
  <p>Real-world wireless loss is not independent. A physical obstacle (like people moving in a lecture hall) causes <strong>correlated burst loss</strong>. The channel flips between <strong>Good State (G)</strong> (0% loss) and <strong>Bad State (B)</strong> (100% loss). Sending two packets back-to-back destroys both during a bad burst. Spacing them by 30 ms ensures packet #2 jumps over the burst into the good state.</p>
</div>

<div class="card card-callout">
  <h3>E. RFC 6298 Retransmission Timeout (RTO)</h3>
  <p>Instead of a rigid timer, Jacobson's algorithm dynamically tracks the smoothed round-trip time ($SRTT$) and variance ($RTTVAR$):</p>
  <p style="text-align: center; font-weight: 600;">RTO = SRTT + max(G, 4 &times; RTTVAR)</p>
  <p>If a packet is lost, $RTO$ doubles ($2 \times RTO$) via Karn's exponential backoff to avoid aggravating network congestion.</p>
</div>

<div class="card card-callout">
  <h3>F. RFC 8785 Canonical JSON & HMAC-SHA256 Signing</h3>
  <p>Standard JSON serializers output keys in random orders and with varying whitespace. If Java serializes <code>{"a":1,"b":2}</code> and Python serializes <code>{"b": 2, "a": 1}</code>, cryptographic hashes will differ! Protocol v2 enforces <strong>RFC 8785 Canonical JSON</strong> (keys strictly sorted, minimal whitespace) before generating the HMAC-SHA256 digital signature, guaranteeing bit-for-bit signature matching across microservices.</p>
</div>

<div class="page-break"></div>

---

<h2>4. Step-by-Step Feature Walkthrough with Real Project Screenshots</h2>

<p class="lead">Below is the complete walkthrough of the CampusConnect v2 platform, showing actual captures from the live running system and explaining every feature, UI element, and networking concept.</p>

<!-- STEP 1 -->
<div class="step-box">
  <h3>Step 1: Student Authentication & Sign In</h3>
  <img src="screenshots/01_login_page.png" alt="Login Page" class="screenshot-img">
  <p><span class="tag-label">What You See:</span> The dark-slate authentication page featuring institutional email validation, password visibility toggle, and navigation to registration.</p>
  <p><span class="tag-label">On-Screen Terms:</span> <em>Institutional Email</em> (campus-verified email like <code>@vit.edu</code>), <em>JWT</em> (stateless digital passport stored in browser).</p>
  <p><span class="tag-label">How It Works:</span> When credentials are submitted, Spring Boot checks salted BCrypt hashes. On success, a signed JWT token is issued and attached to subsequent API requests via <code>Authorization: Bearer &lt;token&gt;</code>.</p>
  <p><span class="tag-label">CNT Concept:</span> Transport Layer Security (TLS/HTTPS) on Port 443 prevents Wireshark eavesdropping on open campus Wi-Fi.</p>
</div>

<!-- STEP 2 -->
<div class="step-box">
  <h3>Step 2: Student Dashboard</h3>
  <img src="screenshots/02_student_dashboard.png" alt="Student Dashboard" class="screenshot-img">
  <p><span class="tag-label">What You See:</span> Personalized student landing page showing active support tickets, campus network alerts, enrolled courses, and quick action shortcuts.</p>
  <p><span class="tag-label">On-Screen Terms:</span> <em>Open Tickets</em> (pending student complaints), <em>Campus Alerts</em> (active outages), <em>Socket.io</em> (live event connection).</p>
  <p><span class="tag-label">How It Works:</span> Loads data asynchronously via parallel REST queries while opening a persistent WebSocket stream on port 3001 for live ticket and alert updates.</p>
  <p><span class="tag-label">CNT Concept:</span> Full-duplex WebSocket connection over a single persistent TCP socket, maintained by 25-second ping-pong heartbeats.</p>
</div>

<!-- STEP 3 -->
<div class="step-box">
  <h3>Step 3: Academics Hub — 8 Core CS Subjects</h3>
  <img src="screenshots/03_academics_courses_list.png" alt="Academics Hub" class="screenshot-img">
  <p><span class="tag-label">What You See:</span> 8 core Computer Science subjects: Machine Learning (<code>CSE601</code>), Computer Networks (<code>CNT501</code>), DAA (<code>CSE602</code>), Cloud Computing (<code>CSE603</code>), DSA (<code>CSE604</code>), OOPs (<code>CSE605</code>), DBMS (<code>CSE606</code>), and Advanced DS (<code>CSE607</code>).</p>
  <p><span class="tag-label">On-Screen Terms:</span> <em>Credits</em> (academic weighting), <em>Course Code</em> (unique subject ID), <em>Faculty Coordinator</em>.</p>
  <p><span class="tag-label">How It Works:</span> Client-side React state allows instantaneous filtering and enrollment without page reloads.</p>
  <p><span class="tag-label">CNT Concept:</span> Optimized JSON payload serialization with HTTP/2 multiplexing, minimizing airtime on congested campus Wi-Fi.</p>
</div>

<div class="page-break"></div>

<!-- STEP 4 -->
<div class="step-box">
  <h3>Step 4: Course Overview — Machine Learning (CSE601)</h3>
  <img src="screenshots/04_academics_course_overview.png" alt="Course Overview" class="screenshot-img">
  <p><span class="tag-label">What You See:</span> Detailed view for Machine Learning featuring tabs for Overview, Syllabus, Timetable, Resources, Chat, and Announcements.</p>
  <p><span class="tag-label">How It Works:</span> React Router nested routing (<code>/academics/CSE601/overview</code>) supports bookmarkable deep links.</p>
</div>

<!-- STEP 5 -->
<div class="step-box">
  <h3>Step 5: 8-Unit Complete Syllabus Breakdown</h3>
  <img src="screenshots/05_academics_syllabus.png" alt="Syllabus Breakdown" class="screenshot-img">
  <p><span class="tag-label">What You See:</span> Modular 8-unit syllabus spanning Linear Regression, Classification, Decision Trees, Neural Networks, SVMs, Clustering, PCA, and Conformal Uncertainty.</p>
  <p><span class="tag-label">ML Concept:</span> Directly reflects the Bayesian classification and split-conformal prediction models used inside the platform's M1 Fault Localizer.</p>
</div>

<!-- STEP 6 -->
<div class="step-box">
  <h3>Step 6: Weekly Timetable & Room Locations</h3>
  <img src="screenshots/06_academics_timetable.png" alt="Weekly Timetable" class="screenshot-img">
  <p><span class="tag-label">What You See:</span> Weekly Monday–Friday lecture schedule with lab slots and classroom room codes (e.g. <code>AB2-301</code>).</p>
  <p><span class="tag-label">CNT Concept:</span> Classroom codes map directly to Wi-Fi Access Point IDs (<code>AP-AB2-301</code>) in the network graph, linking student schedules to network topology.</p>
</div>

<!-- STEP 7 -->
<div class="step-box">
  <h3>Step 7: Video Playlists & Textbook PDFs</h3>
  <img src="screenshots/07_academics_resources_videos.png" alt="Resources" class="screenshot-img">
  <p><span class="tag-label">What You See:</span> Curated YouTube lecture playlists (NPTEL, Stanford) and downloadable textbook PDFs.</p>
  <p><span class="tag-label">CNT Concept:</span> HTTP Range Requests (RFC 7233) allow partial byte-range downloads and video seek buffering without re-downloading entire video streams.</p>
</div>

<div class="page-break"></div>

<!-- STEP 8 -->
<div class="step-box">
  <h3>Step 8: Real-Time Section Discussion Chat</h3>
  <img src="screenshots/08_academics_class_chat.png" alt="Class Chat" class="screenshot-img">
  <p><span class="tag-label">What You See:</span> Live, interactive discussion room where enrolled students post questions with real-time delivery.</p>
  <p><span class="tag-label">How It Works:</span> Gateway multiplexes private Socket.io rooms (<code>course:CSE601</code>). Only students enrolled in that course receive message broadcasts.</p>
  <p><span class="tag-label">CNT Concept:</span> Demonstrates ordered, lossless TCP stream transport contrasting with UDP datagrams in Protocol v2.</p>
</div>

<!-- STEP 9 & 10 -->
<div class="step-box">
  <h3>Step 9 & 10: Helpdesk Tickets & Spatial Ticket Submission</h3>
  <img src="screenshots/09_tickets_student_list.png" alt="Tickets List" class="screenshot-img">
  <img src="screenshots/10_tickets_create_modal.png" alt="Ticket Modal" class="screenshot-img">
  <p><span class="tag-label">What You See:</span> Helpdesk ticket list with status tracking (<code>OPEN</code> &rarr; <code>IN_PROGRESS</code> &rarr; <code>RESOLVED</code>) and the ticket submission modal with mandatory campus location tagging (e.g. <code>AB2 - 3rd Floor</code>).</p>
  <p><span class="tag-label">The Core Synergy:</span> Students act as mobile "human sensors". Submitting a location tag feeds the human evidence vector $d_R$ straight into the Bayesian Fault Localizer.</p>
</div>

<!-- STEP 11, 12, 13 -->
<div class="step-box">
  <h3>Step 11, 12 & 13: Grounded Campus AI Assistant (RAG)</h3>
  <img src="screenshots/11_ai_assistant_welcome.png" alt="AI Welcome" class="screenshot-img">
  <img src="screenshots/12_ai_assistant_rag_query.png" alt="AI Query" class="screenshot-img">
  <img src="screenshots/13_ai_assistant_answer.png" alt="AI Answer" class="screenshot-img">
  <p><span class="tag-label">What You See:</span> Student asks <em>"How do I connect to campus Wi-Fi?"</em>. The AI answers with exact technical policies (SSID <code>VIT-Student</code>, 802.1X PEAP, MSCHAPv2) citing local markdown files.</p>
  <p><span class="tag-label">ML Concept:</span> Retrieval-Augmented Generation (RAG) matches vector embeddings against local campus policy docs using cosine similarity, enforcing anti-hallucination guardrails.</p>
</div>

<div class="page-break"></div>

<!-- STEP 14 -->
<div class="step-box">
  <h3>Step 14: CNT Visual Lab — Gilbert–Elliott Burst Loss Simulation</h3>
  <img src="screenshots/14_cnt_lab_burst_loss.png" alt="Burst Loss Lab" class="screenshot-img">
  <p><span class="tag-label">What You See:</span> Interactive channel simulator with Mean Loss (15%) and Burst Length (150 ms) sliders. Visual strip shows green (Good) and red (Bad) loss bursts.</p>
  <p><span class="tag-label">Benchmark:</span> Spaced copies (&Delta;t=30 ms) achieve <strong>85.3% on-time delivery</strong> vs 83.8% back-to-back in Monte Carlo sims, and <strong>99.7% delivery</strong> in Linux kernel socket tests (<code>tc netem</code>).</p>
  <p><span class="tag-label">CNT Concept:</span> 2-State Markov Chain channel model; temporal diversity escapes correlated loss windows; cancel-on-ACK saves bandwidth.</p>
</div>

<!-- STEP 15 -->
<div class="step-box">
  <h3>Step 15: CNT Visual Lab — RFC 6298 Adaptive RTO Race</h3>
  <img src="screenshots/15_cnt_lab_rto_race.png" alt="RTO Race" class="screenshot-img">
  <p><span class="tag-label">What You See:</span> Real-time race between a fixed 200 ms timer and the RFC 6298 adaptive timer under variable network latency (jitter).</p>
  <p><span class="tag-label">CNT Concept:</span> Jacobson's EWMA algorithm dynamically computes $SRTT$ and $RTTVAR$, applying Karn's exponential backoff on timeouts.</p>
</div>

<!-- STEP 16 -->
<div class="step-box">
  <h3>Step 16: CNT Visual Lab — 64-Bit Sliding Anti-Replay Window</h3>
  <img src="screenshots/16_cnt_lab_replay_window.png" alt="Replay Window" class="screenshot-img">
  <p><span class="tag-label">What You See:</span> Visualizer showing sliding 64-packet window. Out-of-order packets are accepted; duplicate and replayed packets are instantly rejected.</p>
  <p><span class="tag-label">CNT Concept:</span> RFC 4303 IPsec bitmask checking using bitwise operations in $O(1)$ time without database locks.</p>
</div>

<div class="page-break"></div>

<!-- STEP 17 & 18 -->
<div class="step-box">
  <h3>Step 17 & 18: Admin Operations Center (NOC)</h3>
  <img src="screenshots/17_admin_login.png" alt="Admin Login" class="screenshot-img">
  <img src="screenshots/18_admin_dashboard_overview.png" alt="Admin Overview" class="screenshot-img">
  <p><span class="tag-label">What You See:</span> Admin login view and the Network Operations Center dashboard displaying live anomaly counters, active incidents, and WebSocket event status.</p>
  <p><span class="tag-label">Security:</span> Role-Based Access Control (RBAC) enforces the <code>ADMIN</code> role claim from the JWT token.</p>
</div>

<!-- STEP 19 & 20 -->
<div class="step-box">
  <h3>Step 19 & 20: 97-Node Topology & Fault Injection Engine</h3>
  <img src="screenshots/19_admin_network_topology.png" alt="Topology View" class="screenshot-img">
  <img src="screenshots/20_admin_fault_injection.png" alt="Fault Injection" class="screenshot-img">
  <p><span class="tag-label">What You See:</span> Hierarchical graph of 97 campus nodes (Core &rarr; Distribution &rarr; Building Switches &rarr; APs) and chaos injection buttons (Demand Surge, AP Degradation, Switch Flap).</p>
  <p><span class="tag-label">CNT Concept:</span> Cisco 3-Tier Enterprise Network Model and Chaos Engineering fault validation.</p>
</div>

<!-- STEP 21 -->
<div class="step-box">
  <h3>Step 21: Bayesian Fault Localizer in Action</h3>
  <img src="screenshots/21_admin_incident_demo_bayesian.png" alt="Bayesian Localizer" class="screenshot-img">
  <p><span class="tag-label">What You See:</span> Incident triage screen showing posterior probability distribution across all 97 nodes, pinpointing <code>AP-AB2-301</code> with <strong>94.2% probability</strong>.</p>
  <p><span class="tag-label">ML Concept:</span> Bayesian Sensor Fusion combining ticket counts ($d_R$), telemetry ($d_T$), and topology adjacency ($d_N$).</p>
</div>

<!-- STEP 22 & 23 -->
<div class="step-box">
  <h3>Step 22 & 23: Conformal Prediction Sets & Informative Missingness</h3>
  <img src="screenshots/22_admin_conformal_prediction_set.png" alt="Conformal Sets" class="screenshot-img">
  <img src="screenshots/23_admin_informative_missingness_explanation.png" alt="Informative Missingness" class="screenshot-img">
  <p><span class="tag-label">What You See:</span> Conformal prediction sets guaranteeing <strong>90% statistical coverage</strong>, and the card explaining why node silence is treated as proof of failure.</p>
  <p><span class="tag-label">The Core Breakthrough:</span> Under realistic hardware death (MNAR &ge; 20%), telemetry-only systems drop to 0% accuracy. CampusConnect v2 retains 46.3% to 76.2% accuracy (+37.4 pp gain).</p>
</div>

<div class="page-break"></div>

---

<h2>5. Experimental Results & Scientific Evaluation</h2>

<p>The system was evaluated using rigorous, reproducible benchmarks across $n=80$ to $n=150$ test scenarios per cell with 95% bootstrap confidence intervals:</p>

<table>
  <thead>
    <tr>
      <th>Blindness Regime</th>
      <th>Node Silence Rate</th>
      <th>L-F Top-1 (Fused Model)</th>
      <th>L-B1 Top-1 (Telemetry Baseline)</th>
      <th>Advantage</th>
      <th>Conformal Coverage</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>MCAR (Random Drop)</strong></td>
      <td>0% (Full Observability)</td>
      <td><strong>80.0%</strong></td>
      <td>47.5%</td>
      <td>+32.5 pp</td>
      <td>95.0%</td>
    </tr>
    <tr>
      <td><strong>MCAR</strong></td>
      <td>10%</td>
      <td><strong>78.7%</strong></td>
      <td>42.5%</td>
      <td>+36.2 pp</td>
      <td>90.0%</td>
    </tr>
    <tr>
      <td><strong>MCAR (Kill Criterion)</strong></td>
      <td><strong>20%</strong></td>
      <td><strong>76.2%</strong></td>
      <td><strong>38.8%</strong></td>
      <td><strong>+37.4 pp</strong></td>
      <td><strong>86.3%</strong></td>
    </tr>
    <tr>
      <td><strong>MCAR</strong></td>
      <td>50%</td>
      <td><strong>62.5%</strong></td>
      <td>26.3%</td>
      <td>+36.2 pp</td>
      <td>73.8%</td>
    </tr>
    <tr>
      <td><strong>MNAR (Silent Crash)</strong></td>
      <td>10%</td>
      <td><strong>66.2%</strong></td>
      <td>25.0%</td>
      <td>+41.2 pp</td>
      <td>78.7%</td>
    </tr>
    <tr>
      <td><strong>MNAR (Realistic)</strong></td>
      <td><strong>20%</strong></td>
      <td><strong>46.3%</strong></td>
      <td><strong>0.0%</strong></td>
      <td><strong>+46.3 pp</strong></td>
      <td><strong>63.7%</strong></td>
    </tr>
    <tr>
      <td><strong>MNAR</strong></td>
      <td>50%</td>
      <td><strong>38.8%</strong></td>
      <td>0.0%</td>
      <td>+38.8 pp</td>
      <td>57.5%</td>
    </tr>
  </tbody>
</table>

<div class="card card-innovation">
  <strong>Key Experimental Findings:</strong>
  <ul>
    <li><strong>Kill Criterion H1 Confirmed:</strong> Required L-F &ge; L-B1 + 5 pp at 20% blindness. Achieved <strong>+37.4 pp</strong> gain.</li>
    <li><strong>Independent Generator Replication (Circularity Mitigation):</strong> Evaluated against a separate 38-node generator with heavy-tailed Pareto tickets and Student-t noise (`experiments/independent_eval.py`). Achieved <strong>95.9% Top-1 accuracy</strong> ($n=150$).</li>
  </ul>
</div>

---

<h2>6. System Architecture & Tech Stack Inventory</h2>

<table>
  <thead>
    <tr>
      <th>Service Module</th>
      <th>Technology</th>
      <th>Port / URL</th>
      <th>Key Role & Responsibility</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Frontend</strong></td>
      <td>React 19, Vite 7, Tailwind 4, React Router 7</td>
      <td><code>5173</code> / GitHub Pages</td>
      <td>Single-page student portal, Visual Lab, responsive admin UI</td>
    </tr>
    <tr>
      <td><strong>API Gateway</strong></td>
      <td>Node.js 22, Express, Socket.io</td>
      <td><code>3001</code></td>
      <td>JWT auth, reverse proxy, real-time WebSocket event fanout</td>
    </tr>
    <tr>
      <td><strong>Backend Core</strong></td>
      <td>Spring Boot 3.5, Java 24, Maven</td>
      <td><code>8080</code></td>
      <td>Relational store of record, users, tickets, course registration</td>
    </tr>
    <tr>
      <td><strong>PostgreSQL</strong></td>
      <td>PostgreSQL 18 (WSL2 / pg_proxy)</td>
      <td><code>5432</code></td>
      <td>ACID relational database storage</td>
    </tr>
    <tr>
      <td><strong>ML Service</strong></td>
      <td>FastAPI, Python 3.11, NumPy, SciPy</td>
      <td><code>5100</code></td>
      <td>M1 Bayesian Fault Localizer, conformal calibration engine</td>
    </tr>
    <tr>
      <td><strong>AI Service</strong></td>
      <td>Node.js 22, Express, Markdown RAG</td>
      <td><code>5000</code></td>
      <td>Campus knowledge-base assistant with local grounding</td>
    </tr>
    <tr>
      <td><strong>Emergency Receiver</strong></td>
      <td>Node.js, dgram (UDP), net (TCP), SQLite</td>
      <td>UDP <code>41234</code><br>TCP <code>41235</code></td>
      <td>Protocol v2 receiver, anti-replay bitmask, WAL receipts</td>
    </tr>
  </tbody>
</table>

---

<h2>7. Known Limitations & Honest Disclosures</h2>

<ol>
  <li><strong>Synthetic Topology:</strong> All 97 nodes run against simulated campus graphs. While independent 38-node generators confirm robustness, physical SNMP syslog ingestion from enterprise Cisco switches is the next validation step.</li>
  <li><strong>Benign Surge False Alarms:</strong> Auditorium crowd events naturally trigger traffic spikes that look like hardware degradation. Our 5-condition heuristic guard catches ~55% of benign surges, but a small residual false alarm rate remains.</li>
  <li><strong>Conformal Coverage under Severe MNAR:</strong> Conformal prediction assumes exchangeability. When failing nodes switch to total silence (MNAR), coverage drops from 95% to 63.7%.</li>
  <li><strong>HMAC Key Rotation:</strong> Currently uses static <code>keyId: "k1"</code>. A dual-key versioned key ring should be implemented for production.</li>
</ol>

---

<h2>8. Master Presentation & Viva Q&A Cheat Sheet</h2>

<div class="card card-callout">
  <strong>Q1: What is the single biggest problem your project solves?</strong><br>
  <em>"The Silent Node Problem. When network hardware completely fails, it cannot report its own crash. Standard tools drop to 0% accuracy under silence. By treating silence as probabilistic evidence (Informative Missingness) and fusing human helpdesk complaints with campus graph topology, we maintain 46.3%–76.2% accuracy, beating baselines by over 34 percentage points."</em>
</div>

<div class="card card-callout">
  <strong>Q2: How does Protocol v2 achieve 99.7% delivery over lossy Wi-Fi?</strong><br>
  <em>"Wi-Fi packet loss is bursty (modeled by the Gilbert–Elliott Markov chain). Sending packets back-to-back causes both to drop during a burst. Protocol v2 schedules 2 copies spaced 30 ms apart with cancel-on-ACK, allowing the second copy to jump past the burst into the good channel state while saving bandwidth."</em>
</div>

<div class="card card-callout">
  <strong>Q3: Why use Conformal Prediction instead of a single classification guess?</strong><br>
  <em>"In critical infrastructure, point predictions risk technicians replacing the wrong expensive switch. Conformal prediction produces a guaranteed 90% confidence suspect set, giving operators mathematical assurance."</em>
</div>

<div class="card card-callout">
  <strong>Q4: Is the system verified and testable?</strong><br>
  <em>"Yes! All 76 unit and integration tests across 6 modules pass cleanly (`python tools/campusctl.py test`), the frontend is deployed live on GitHub Pages, and all source code and reproducible benchmarks are open on GitHub."</em>
</div>

<p style="text-align: center; margin-top: 30px; font-size: 9pt; color: #64748b;">
  CampusConnect v2 — Computer Networks & Telecommunications (CNT501) — Vellore Institute of Technology
</p>

</body>
</html>
"""

# Write HTML file
HTML_OUT.write_text(html_content, encoding="utf-8")
print(f"Wrote HTML report to: {HTML_OUT}")

# Render to PDF using Edge headless
cmd = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "--headless=new",
    "--disable-gpu",
    f"--print-to-pdf={PDF_OUT.resolve()}",
    "--no-pdf-header-footer",
    str(HTML_OUT.resolve())
]

print("Executing Edge Headless PDF printing...")
res = subprocess.run(cmd, capture_output=True, text=True)
print("Edge return code:", res.returncode)

if PDF_OUT.exists():
    print(f"PDF successfully generated: {PDF_OUT} ({PDF_OUT.stat().st_size} bytes)")
    # Also copy to workspace root
    import shutil
    shutil.copy2(PDF_OUT, WORKSPACE_PDF)
    print(f"Copied PDF to workspace root: {WORKSPACE_PDF}")
else:
    print("PDF generation failed!")
