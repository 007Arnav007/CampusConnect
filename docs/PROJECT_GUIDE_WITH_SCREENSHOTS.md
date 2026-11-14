# CampusConnect v2 — Complete Guided Tour & Feature Walkthrough
**A Friendly, Screen-by-Screen Visual Guide with Real Screenshots and Simple Explanations**

---

## 🌟 What is CampusConnect v2? (In 1 Minute)

Think of **CampusConnect v2** as a smart two-in-one platform built for college campuses:

1. **For Students:** It is a friendly academic and support portal. You can find all study materials for 8 CS subjects (syllabi, lecture timetables, curated YouTube playlists, textbook PDFs, and real-time class chat), file support complaints if anything is broken, and chat with a campus AI assistant.
2. **For Campus Network Engineers:** It is an intelligent **"Network Doctor"**. When Wi-Fi routers crash or burn out, they stop sending data and go completely silent. Our AI connects the dots between student complaints and the campus network map to identify exactly which Wi-Fi router or switch failed!

Let's take a tour through the entire application screen-by-screen, starting right from the login page!

---

## 🧭 Visual Walkthrough: Screen by Screen

---

### Step 1: Logging In to CampusConnect

![Student Login Page](screenshots/01_login_page.png)

#### 🖥️ What You See on the Screen:
* A modern, dark-themed login box with the CampusConnect Wi-Fi logo at the top.
* **Institutional Email input field:** Where you type your college email (e.g. `priya.patel@example.edu` or any `@vit.edu` email).
* **Password field:** With an eye toggle icon to show or hide your password.
* **"Sign In" button:** Submits your credentials.
* **Top Navigation Bar:** Quick links to return to Home, Sign In, Admin Login, or "Get Started" (Register an account).

#### 🏷️ Terms Explained Simply:
* **Institutional Email:** A college-issued email ID (like `@vit.edu`) that proves you are a verified student or faculty member on campus.
* **JWT (JSON Web Token):** Like a digital campus ID card stamped with your permissions. Once you log in, the server gives your browser this digital pass so you don't have to retype your password on every page.

#### ⚙️ How It Works in Plain English:
When you click **Sign in**, your browser encrypts your email and password and sends them to the server. The server verifies your credentials, gives your browser a secure digital pass (JWT token), and automatically redirects you to the student dashboard.

#### 📡 The Networking Behind It (In Simple Words):
* **HTTPS / SSL Encryption:** Your password isn't sent as open text. It is scrambled across the network so that nobody sitting on the same campus Wi-Fi can snoop on your password.

---

### Step 2: The Student Dashboard

![Student Dashboard](screenshots/02_student_dashboard.png)

#### 🖥️ What You See on the Screen:
* **Top Greeting:** *"Welcome back, Priya Patel"* with your student status.
* **Quick Stats Cards:**
  * **Open Tickets:** Number of support complaints you currently have open.
  * **Campus Alerts:** Active network issues or announcements across campus.
  * **Enrolled Courses:** 8 Computer Science subjects ready to access.
* **Quick Action Buttons:**
  * *"Submit a Ticket"* (Report an issue).
  * *"Go to Academics"* (Check notes and syllabus).
  * *"Ask AI Assistant"* (Get instant campus answers).
  * *"Open CNT Lab"* (Interactive networking visualizer).
* **Sidebar Menu (Left):** Gives one-click access to Dashboard, Academics, Support Tickets, AI Assistant, Visual Lab, Notifications, and Profile.

#### 🏷️ Terms Explained Simply:
* **Dashboard:** A central home screen that summarizes everything you care about in one place.
* **Open Ticket:** A complaint you submitted that is currently being looked at by campus staff.

#### ⚙️ How It Works in Plain English:
As soon as you log in, this dashboard automatically checks your account, counts how many tickets you've filed, checks if any Wi-Fi in your block is down, and shows you helpful shortcuts.

#### 📡 The Networking Behind It (In Simple Words):
* **WebSockets (Live Updates):** Instead of you having to refresh the page over and over to see if your ticket was resolved, the server keeps a live line open (a WebSocket). When an admin updates your ticket, the screen updates in real time!

---

### Step 3: Academics Hub — 8 Core Computer Science Subjects

![Academics Hub](screenshots/03_academics_courses_list.png)

#### 🖥️ What You See on the Screen:
A clean directory showing **8 essential Computer Science subjects**:
1. **Machine Learning (`CSE601`)**
2. **Computer Networks (`CNT501`)**
3. **Design & Analysis of Algorithms (`CSE602`)**
4. **Cloud Computing (`CSE603`)**
5. **Data Structures & Algorithms (`CSE604`)**
6. **Object-Oriented Programming (`CSE605`)**
7. **Database Management Systems (`CSE606`)**
8. **Advanced Data Structures (`CSE607`)**

Each card shows the course code, credit count (e.g. 4 credits), professor name, class capacity, and an **"Open Course"** or **"Enroll"** button.

#### 🏷️ Terms Explained Simply:
* **Course Code:** A short unique ID for a subject (e.g., `CNT501` stands for Computer Networks and Telecommunications, 5th semester, course 01).
* **Credits:** The academic weightage of the course towards your degree.

#### ⚙️ How It Works in Plain English:
Clicking on any card opens that subject's complete study center. Let's click on **Machine Learning** to see what's inside!

---

### Step 4: Course Overview — Machine Learning (`CSE601`)

![Course Overview](screenshots/04_academics_course_overview.png)

#### 🖥️ What You See on the Screen:
* Subject title: **Machine Learning** with code `CSE601`.
* Department, Faculty name, and credits.
* **Navigation Tabs at the top:**
  * **Overview:** Summary of the subject.
  * **Syllabus:** The full curriculum broken down into 8 units.
  * **Timetable:** Days, times, and room locations for lectures & labs.
  * **Resources:** Curated YouTube playlists and textbook PDFs.
  * **Chat:** Real-time discussion room for this class.
  * **Announcements:** Exam dates and assignment updates.

#### ⚙️ How It Works in Plain English:
Each tab keeps your study materials neatly organized so you never have to search multiple websites or chat groups for notes.

---

### Step 5: 8-Unit Complete Syllabus Breakdown

![Syllabus Breakdown](screenshots/05_academics_syllabus.png)

#### 🖥️ What You See on the Screen:
A step-by-step breakdown of all 8 teaching modules for the semester:
* Unit 1: Introduction & Linear Regression
* Unit 2: Classification & Logistic Regression
* Unit 3: Decision Trees & Random Forests
* Unit 4: Neural Networks & Deep Learning
* Unit 5: Support Vector Machines (SVM)
* Unit 6: Unsupervised Learning & Clustering
* Unit 7: Dimensionality Reduction (PCA)
* Unit 8: Model Evaluation & Conformal Uncertainty

#### 🤖 The Machine Learning Behind It (In Simple Words):
This syllabus doesn't just teach theory — the exact topics in Unit 8 (**Bayesian Inference** and **Conformal Prediction**) are the exact machine learning methods our own project uses to diagnose campus network faults!

---

### Step 6: Weekly Timetable & Room Locations

![Weekly Timetable](screenshots/06_academics_timetable.png)

#### 🖥️ What You See on the Screen:
* A weekly schedule from Monday to Friday.
* Lecture slots with start and end times.
* **Room Numbers:** e.g., `AB2-301` (Academic Block 2, Room 301).
* Dedicated practical lab sessions.

#### 📡 The Networking Connection (In Simple Words):
Notice the room number `AB2-301`? Every classroom on campus has a Wi-Fi router mounted on the ceiling with a matching name: `AP-AB2-301`. Because our platform knows which room you're in, it can immediately tell which Wi-Fi router serves your class!

---

### Step 7: Video Lecture Playlists & Textbook PDFs

![Learning Resources](screenshots/07_academics_resources_videos.png)

#### 🖥️ What You See on the Screen:
* **YouTube Playlists Card:** Curated links to top university lecture series (NPTEL, Stanford, MIT).
* **Reference Books Card:** Recommended textbook PDFs and reference manuals available for reading and download.

#### 📡 The Networking Behind It (In Simple Words):
* **Video Streaming & Buffering:** When you stream a lecture video, your device uses **TCP flow control**. Instead of downloading an entire 1-hour video at once (which would freeze slow campus Wi-Fi), the video is streamed in small 5-second chunks as you watch.

---

### Step 8: Real-Time Class Discussion Chat

![Real-Time Class Chat](screenshots/08_academics_class_chat.png)

#### 🖥️ What You See on the Screen:
* A live discussion room for the class.
* Messages sent by students with timestamps and user avatars.
* A message input box at the bottom with a Send button.

#### ⚙️ How It Works in Plain English:
Whenever a student has a doubt about homework or an upcoming test, they post it here. Everyone enrolled in the course sees it immediately on their screen without needing to reload the page.

#### 📡 The Networking Behind It (In Simple Words):
* **Chat Rooms over WebSockets:** The server creates a private "channel" for each course. When someone types a message, the server only blasts it to students inside that specific course room, keeping other classes completely private.

---

### Step 9 & 10: Student Helpdesk & Filing a Support Ticket

![Student Tickets List](screenshots/09_tickets_student_list.png)
*(Above: List of filed tickets showing priority colors, categories, and progress status)*

![Ticket Submission Modal](screenshots/10_tickets_create_modal.png)
*(Above: Pop-up form to file a new complaint with location details)*

#### 🖥️ What You See on the Screen:
* **Ticket List:** Shows tickets with status badges: `OPEN` (Waiting for staff), `IN_PROGRESS` (Being fixed), and `RESOLVED` (Done).
* **New Ticket Form:**
  * **Category Dropdown:** Network, Academic, Infrastructure, Hostel.
  * **Priority Level:** Low, Medium, High, Urgent.
  * **Title & Description:** Where you explain the problem.
  * **Campus Location Selector:** Crucial field where you select your building and floor (e.g. `AB2 - 3rd Floor`).

#### 🏷️ Terms Explained Simply:
* **Ticket:** An official tracking record for a problem you report.
* **Priority (Low vs Urgent):** Tells campus staff if it's a minor question or a critical outage affecting hundreds of students.

#### 🤖 How This Feeds the AI (In Simple Words):
Students are like **"human sensors"** walking around campus. When you report *"Wi-Fi stopped working on AB2 3rd Floor"*, the system doesn't just send an email — it feeds your location straight into our AI fault detector!

---

### Step 11, 12 & 13: Grounded Campus AI Assistant

![AI Assistant Welcome Screen](screenshots/11_ai_assistant_welcome.png)
*(Above: Friendly AI chatbot screen with suggested campus questions)*

![Asking a Question](screenshots/12_ai_assistant_rag_query.png)
*(Above: Student asking: "How do I connect to campus Wi-Fi?")*

![Accurate Grounded Response](screenshots/13_ai_assistant_answer.png)
*(Above: Instant step-by-step connection guide citing official campus policy docs)*

#### 🖥️ What You See on the Screen:
* An AI chat window where students can ask questions about campus life, hostel rules, or Wi-Fi setup.
* When asked *"How do I connect to campus Wi-Fi?"*, the AI immediately replies with official instructions: select the `VIT-Student` Wi-Fi network, use 802.1X PEAP authentication, and log in with your student credentials.
* It shows the exact document source it used to answer!

#### 🏷️ Terms Explained Simply:
* **RAG (Retrieval-Augmented Generation):** Normally, AI chatbots might make up fake facts (called hallucinations). RAG fixes this by forcing the AI to **first search college PDF documents** on the server, find the true answer, and only then write its response.
* **Guardrails:** Rules programmed into the AI so it stays helpful and refuses to answer irrelevant or inappropriate questions.

---

### Step 14: CNT Visual Lab — Burst Loss & Wi-Fi Glitch Simulator

![CNT Lab - Gilbert-Elliott Simulation](screenshots/14_cnt_lab_burst_loss.png)

#### 🖥️ What You See on the Screen:
An interactive laboratory that lets you simulate what happens to Wi-Fi packets when an antenna gets blocked:
* **Mean Loss Slider:** Set how bad the Wi-Fi connection is (e.g. 15% packet loss).
* **Mean Burst Length Slider:** Set how long glitches last (e.g. 150 ms).
* **The Visual Strip:**
  * **Green bands:** Wi-Fi is working smoothly.
  * **Red bands:** A temporary glitch/burst loss where packets get dropped.
* **The Big Comparison Result:**
  * **Back-to-Back packets (0 ms gap):** 83.8% success.
  * **Spaced packets (30 ms gap):** **85.3% success** (and **99.7%** in physical Linux kernel tests)!

#### 🏷️ Terms Explained Simply:
* **Packet Loss:** When a piece of data sent over the air gets lost and never reaches the other computer.
* **Burst Loss:** In Wi-Fi, packets don't just drop one by one; they drop in clusters or "bursts" (for example, when someone walks in front of the antenna or a microwave turns on).
* **Gilbert–Elliott Model:** A simple mathematical model that flips between two states: **Good** (everything works) and **Bad** (packets get dropped).

#### 📡 The Networking Secret Explained:
Why does spacing packets work so well?
If you shoot two packets right next to each other during a red glitch band, **both packets get destroyed**. But if you pause for just 30 milliseconds before sending the second packet, the glitch ends and the second packet survives! Once the server acknowledges packet #1, packet #2 is cancelled so no bandwidth is wasted.

---

### Step 15: CNT Visual Lab — The Adaptive Timer Race (RFC 6298)

![CNT Lab - RTO Race](screenshots/15_cnt_lab_rto_race.png)

#### 🖥️ What You See on the Screen:
A race between two countdown timers:
1. **A Fixed Timer (dumb):** Always waits exactly 200 ms.
2. **The RFC 6298 Adaptive Timer (smart):** Automatically measures how fast the network is running and adjusts its countdown clock dynamically!

#### 🏷️ Terms Explained Simply:
* **RTO (Retransmission Timeout):** How long your phone waits for an acknowledgement before saying *"The server didn't reply, let me re-send the packet!"*
* **Jitter:** Unpredictable fluctuations in network speed (sometimes 20 ms, sometimes 120 ms).

#### 📡 The Networking Secret Explained:
If a timer is too short, your phone gets impatient and sends duplicate packets, clogging the Wi-Fi. If it's too long, you sit staring at a loading spinner. The **RFC 6298 adaptive timer** uses running math (EWMA) to stay just above the current delay, making retransmissions as fast and efficient as possible.

---

### Step 16: CNT Visual Lab — 64-Bit Anti-Replay Window (RFC 4303)

![CNT Lab - Replay Window](screenshots/16_cnt_lab_replay_window.png)

#### 🖥️ What You See on the Screen:
An interactive visualizer showing a security check for incoming packets:
* Packets arriving with higher numbers slide the green window forward.
* Packets arriving slightly out of order (which is normal on UDP) are safely accepted.
* Any duplicate packet or replayed packet is caught in red and immediately thrown away!

#### 🏷️ Terms Explained Simply:
* **Replay Attack:** When a malicious hacker intercepts a valid packet (like *"Unlock Campus Gate"*) and broadcasts it again 2 hours later to fool the server.
* **Sliding Window:** A moving frame of numbers (like looking through a sliding cardboard cutout) that remembers which packet numbers were already processed.
* **Bitmask:** Using 64 binary bits (`0` or `1`) inside the computer's CPU to check for duplicates in less than 1 nanosecond without needing a slow database query.

---

### Step 17 & 18: Admin Sign In & Network Operations Dashboard

![Admin Login](screenshots/17_admin_login.png)
*(Above: Admin sign in portal for network engineers)*

![Admin Overview](screenshots/18_admin_dashboard_overview.png)
*(Above: Network Operations Center showing real-time network health and ticket streams)*

#### 🖥️ What You See on the Screen:
* Signing in as `admin@example.edu` unlocks the **Admin Operations Center**.
* Live counters showing active network anomalies across campus buildings.
* A live stream of incoming complaints and automated dispatch suggestions.
* Green WebSocket indicator showing active live connection to the core servers.

---

### Step 19 & 20: Campus Network Map & Chaos Fault Injection

![Network Topology View](screenshots/19_admin_network_topology.png)
*(Above: Hierarchical tree showing 97 campus network devices from Core Routers to Wi-Fi APs)*

![Fault Injection Panel](screenshots/20_admin_fault_injection.png)
*(Above: Interactive buttons to break simulated routers and test how the system reacts)*

#### 🖥️ What You See on the Screen:
* **The Network Map:** Displays the physical layout of the campus:
  * **Core Routers:** The central brains connected to the internet.
  * **Building Switches:** The main network hubs inside each building (Academic Block 1, Academic Block 2, Science Block, Library, Hostels).
  * **Access Points (APs):** The Wi-Fi boxes on every floor.
* **Chaos Testing Buttons:** Allows teachers or engineers to test the system by deliberately injecting problems:
  * **Demand Surge:** Simulates 2,000 students gathering in the auditorium for a festival.
  * **AP Degradation:** Injects 80% packet drop on a single Wi-Fi router.
  * **Switch Flap:** Simulates a loose cable cutting off an entire building.

---

### Step 21: The Bayesian Network Doctor in Action

![Bayesian Localizer Demo](screenshots/21_admin_incident_demo_bayesian.png)

#### 🖥️ What You See on the Screen:
* When a failure happens (e.g., students in Academic Block 2 start complaining), the admin clicks **Run Localizer**.
* The AI analyzes the clues and outputs a probability bar chart across all 97 devices.
* It immediately points to **`AP-AB2-301`** with **94.2% probability**!

#### 🤖 The Machine Learning Secret (Bayesian Inference Explained Simply):
Think of this like a doctor diagnosing an illness:
1. **Symptom 1 (Human complaints):** 14 students in AB2 filed tickets saying Wi-Fi is broken.
2. **Symptom 2 (Network map):** The parent switch `SW-AB2-01` is working fine, so the whole building isn't down — it's just one room.
3. **Symptom 3 (Telemetry):** Router `AP-AB2-301` is acting dead.
The Bayesian formula multiplies these clues together to conclude: *"There is a 94.2% chance that `AP-AB2-301` is the broken device!"*

---

### Step 22: Conformal Prediction — The "Guaranteed Suspect Box"

![Conformal Prediction Sets](screenshots/22_admin_conformal_prediction_set.png)

#### 🖥️ What You See on the Screen:
* Instead of just guessing one single device and hoping it's right, the AI provides a **Prediction Set**:
  $$\text{Suspect Set} = \{\text{AP-AB2-301}, \text{SW-AB2-01}\}$$
* It gives an explicit **90% Mathematical Guarantee**!

#### 🤖 The Machine Learning Secret (Conformal Prediction Explained Simply):
In the real world, if an AI is only 51% sure, sending a technician to climb a ladder and replace the wrong router wastes hours of time. **Conformal prediction** guarantees that 90% of the time, the true broken device is inside this small suspect list. It gives network operators confidence before they send a repair crew.

---

### Step 23: Informative Missingness — The Silent Router Clue

![Informative Missingness Explanation](screenshots/23_admin_informative_missingness_explanation.png)

#### 🖥️ What You See on the Screen:
An explanation card highlighting our core research breakthrough:
> *"When `AP-AB2-301` died, it sent zero telemetry packets. Traditional monitoring systems saw no data and assumed nothing was wrong (0.0 score). CampusConnect v2 knows that **silence is proof of failure**."*

#### 📡 & 🤖 The Core Research Breakthrough Explained Simply:
* If a student doesn't submit homework, maybe they forgot (random missing data).
* But if a router that is supposed to beep every 5 seconds suddenly stops beeping at the exact moment students start complaining about Wi-Fi, **its silence is not an accident — it is dead!**
* **The Result:** When routers completely die, standard industry tools drop to **0% accuracy**. CampusConnect v2's smart model maintains **46.3% to 76.2% accuracy**, beating traditional tools by **over 34 percentage points**!

---

## 🎯 Quick Summary Table: What Every Feature Does

| Screen / Feature | What It Does for the User | The Smart Tech Behind It |
|---|---|---|
| **Login & Register** | Signs in students & staff securely | HTTPS, JWT tokens, BCrypt passwords |
| **Student Dashboard** | Central home screen with counters | Live WebSockets for instant updates |
| **Academics Hub (8 CS Subjects)** | Complete study materials for all core subjects | Fast compressed JSON over HTTP/2 |
| **Course Syllabus** | 8 modular units for exam prep | Clear curriculum breakdown |
| **Timetable** | Shows lecture times and classroom codes | Classrooms link to Wi-Fi router IDs |
| **Resources & Playlists** | YouTube lectures and PDF textbooks | HTTP video chunk streaming (TCP flow control) |
| **Class Discussion Chat** | Live Q&A chatroom for each course | Real-time WebSocket room channels |
| **Helpdesk Tickets** | Submit and track complaints | Spatial location tagging ($d_R$ evidence) |
| **Campus AI Assistant** | Answers campus questions accurately | RAG (Retrieval-Augmented Generation) |
| **Gilbert–Elliott Simulator** | Visualizes Wi-Fi glitches and packet drops | 2-state Markov model, Spaced UDP copies |
| **Adaptive Timer Race** | Shows how smart timers stop lag | RFC 6298 EWMA math vs dumb fixed timers |
| **Anti-Replay Window** | Prevents hackers from replaying messages | RFC 4303 64-bit sliding bitmask ($O(1)$) |
| **Admin Overview & Topology** | Map of all 97 campus routers & switches | Cisco 3-tier hierarchical network design |
| **Fault Injection** | Lets admins test broken routers | Chaos engineering simulation |
| **Bayesian Fault Localizer** | Finds the broken router from clues | Bayesian Probability & Sensor Fusion |
| **Conformal Prediction Sets** | Gives guaranteed suspect lists | 90% confidence uncertainty quantification |
| **Informative Missingness** | Uses router silence as proof of a crash | Missing Not at Random (MNAR) AI modeling |

---

## 🎓 30-Second Viva Pitch for Teachers & Evaluators

> *"CampusConnect v2 is a full-stack campus platform that combines a complete student academic portal (with 8 CS subjects, syllabus, timetable, video resources, and live chat) with an intelligent network fault localizer.*
>
> *Our main networking breakthrough is solving the **Silent Node Problem**: when a Wi-Fi router crashes on campus, it cannot report its own death. By treating router silence as active evidence (**Informative Missingness**) and fusing student helpdesk tickets with the campus network graph, our system pinpoints broken routers with up to **+37 percentage points higher accuracy** than standard network monitoring tools."*

---

*CampusConnect v2 — Computer Networks & Telecommunications (CNT501)*  
**Live Site:** [https://007arnav007.github.io/CampusConnect/](https://007arnav007.github.io/CampusConnect/)  
**GitHub Repository:** [007Arnav007/CampusConnect](https://github.com/007Arnav007/CampusConnect)

