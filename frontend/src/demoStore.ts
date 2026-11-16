// Demo and Standalone fallback data store for CampusConnect frontend
// Used when the backend server is unreachable (e.g. GitHub Pages static deployment or offline testing)

import type {
  AuthResponse,
  Ticket,
  TicketMessage,
  AcademicCourse,
  AcademicMaterial,
  AcademicAssignment,
  AcademicNotice,
  AcademicDiscussion,
  Incident,
  NetworkNode,
  NetworkTelemetry,
  AssistantResponse,
  NetworkMetrics,
  EmergencyDispatchResponse,
  Notification,
  User,
} from "./api";

const DEMO_USERS_KEY = "campusconnect.demo.users";
const DEMO_TICKETS_KEY = "campusconnect.demo.tickets";
const DEMO_MESSAGES_KEY = "campusconnect.demo.messages";
const DEMO_ENROLLMENTS_KEY = "campusconnect.demo.enrollments";
const DEMO_DISCUSSIONS_KEY = "campusconnect.demo.discussions";

// Initial realistic campus tickets
const INITIAL_TICKETS: Ticket[] = [
  {
    id: "t-1",
    ticketNumber: "TICK-4821",
    title: "Wi-Fi connectivity drop in AB2 3rd Floor",
    description: "Intermittent connection loss observed on Access Point AP-AB2-301 during Machine Learning lecture.",
    category: "Network",
    priority: "HIGH",
    status: "OPEN",
    location: "AB2-3rd-Floor",
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
    createdBy: "Priya Patel",
  },
  {
    id: "t-2",
    ticketNumber: "TICK-4790",
    title: "Hostel Block D Access Point router blinking red",
    description: "Students in rooms 401-410 cannot connect to VIT-Student network. LED indicator is solid red.",
    category: "Network",
    priority: "MEDIUM",
    status: "IN_PROGRESS",
    location: "Hostel-Block-D",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 43200000).toISOString(),
    createdBy: "Arjun Kumar",
  },
  {
    id: "t-3",
    ticketNumber: "TICK-4652",
    title: "Library digital research kiosk network latency",
    description: "High round-trip ping latency (>240ms) when opening IEEE digital library portal.",
    category: "Infrastructure",
    priority: "LOW",
    status: "RESOLVED",
    location: "Central-Library",
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    createdBy: "Campus Student",
  },
];

// Initial 8 CS Subjects
const INITIAL_COURSES: AcademicCourse[] = [
  {
    id: "c-cse601",
    code: "CSE601",
    title: "Machine Learning",
    description: "Supervised and unsupervised learning, Bayesian inference, deep neural networks, and conformal uncertainty.",
    department: "Computer Science",
    credits: 4,
    facultyId: "fac-1",
    facultyName: "Dr. S. Raman",
    sectionId: "sec-cse601",
    term: "Winter 2026",
    room: "AB2-301",
    schedule: "Mon/Wed 10:00 - 11:30 AM",
    capacity: 65,
    enrolled: 58,
  },
  {
    id: "c-cnt501",
    code: "CNT501",
    title: "Computer Networks & Telecommunications",
    description: "OSI stack, TCP/UDP transport, congestion control, Protocol v2, Gilbert-Elliott channel modeling, and routing algorithms.",
    department: "Computer Science",
    credits: 4,
    facultyId: "fac-2",
    facultyName: "Prof. V. Sharma",
    sectionId: "sec-cnt501",
    term: "Winter 2026",
    room: "AB2-204",
    schedule: "Tue/Thu 02:00 - 03:30 PM",
    capacity: 65,
    enrolled: 62,
  },
  {
    id: "c-cse602",
    code: "CSE602",
    title: "Design & Analysis of Algorithms",
    description: "Asymptotic notation, divide and conquer, dynamic programming, greedy strategies, and graph network flows.",
    department: "Computer Science",
    credits: 4,
    facultyId: "fac-3",
    facultyName: "Dr. K. Menon",
    sectionId: "sec-cse602",
    term: "Winter 2026",
    room: "AB1-102",
    schedule: "Mon/Wed 02:00 - 03:30 PM",
    capacity: 60,
    enrolled: 54,
  },
  {
    id: "c-cse603",
    code: "CSE603",
    title: "Cloud Computing & Distributed Systems",
    description: "Virtualization, microservices architecture, AWS/GCP infrastructure, Kubernetes orchestration, and serverless computing.",
    department: "Computer Science",
    credits: 3,
    facultyId: "fac-4",
    facultyName: "Prof. R. Iyer",
    sectionId: "sec-cse603",
    term: "Winter 2026",
    room: "SJT-401",
    schedule: "Fri 09:00 AM - 12:00 PM",
    capacity: 60,
    enrolled: 51,
  },
  {
    id: "c-cse604",
    code: "CSE604",
    title: "Data Structures & Algorithms",
    description: "Linear and hierarchical data structures, binary search trees, AVL trees, heaps, hashing, and graph traversals.",
    department: "Computer Science",
    credits: 4,
    facultyId: "fac-5",
    facultyName: "Dr. A. Gupta",
    sectionId: "sec-cse604",
    term: "Winter 2026",
    room: "MB-202",
    schedule: "Tue/Thu 10:00 - 11:30 AM",
    capacity: 70,
    enrolled: 68,
  },
  {
    id: "c-cse605",
    code: "CSE605",
    title: "Object-Oriented Programming (Java/C++)",
    description: "Encapsulation, inheritance, polymorphism, design patterns, exception handling, and concurrent multithreading.",
    department: "Computer Science",
    credits: 3,
    facultyId: "fac-6",
    facultyName: "Prof. P. Verma",
    sectionId: "sec-cse605",
    term: "Winter 2026",
    room: "AB2-105",
    schedule: "Wed/Fri 03:30 - 05:00 PM",
    capacity: 60,
    enrolled: 47,
  },
  {
    id: "c-cse606",
    code: "CSE606",
    title: "Database Management Systems",
    description: "Relational algebra, SQL, normalization (1NF-BCNF), transaction ACID properties, concurrency control, and indexing.",
    department: "Computer Science",
    credits: 4,
    facultyId: "fac-7",
    facultyName: "Dr. N. Deshmukh",
    sectionId: "sec-cse606",
    term: "Winter 2026",
    room: "SJT-205",
    schedule: "Mon/Thu 08:30 - 10:00 AM",
    capacity: 65,
    enrolled: 60,
  },
  {
    id: "c-cse607",
    code: "CSE607",
    title: "Advanced Data Structures",
    description: "Tries, Suffix Trees, Segment Trees, Fenwick Trees, Disjoint Set Union (DSU), and persistent data structures.",
    department: "Computer Science",
    credits: 3,
    facultyId: "fac-8",
    facultyName: "Prof. M. Reddy",
    sectionId: "sec-cse607",
    term: "Winter 2026",
    room: "AB1-303",
    schedule: "Tue/Fri 11:30 AM - 01:00 PM",
    capacity: 55,
    enrolled: 42,
  },
];

const INITIAL_MATERIALS: Record<string, AcademicMaterial[]> = {
  "c-cse601": [
    {
      id: "mat-1",
      title: "NPTEL Machine Learning Lecture Series (Prof. B. Ravindran)",
      description: "Curated comprehensive video lectures covering supervised learning, classification, and backpropagation.",
      resourceUrl: "https://www.youtube.com/playlist?list=PLyqSpQzTE6M9gCgAjhPW8n5z848RE5042",
      materialType: "VIDEO",
      createdAt: new Date().toISOString(),
    },
    {
      id: "mat-2",
      title: "Pattern Recognition and Machine Learning (Christopher Bishop)",
      description: "Official reference textbook PDF for Bayesian inference and linear models.",
      resourceUrl: "https://www.microsoft.com/en-us/research/uploads/prod/2006/01/Bishop-Pattern-Recognition-and-Machine-Learning-2006.pdf",
      materialType: "PDF",
      createdAt: new Date().toISOString(),
    },
    {
      id: "mat-3",
      title: "Stanford CS229: Machine Learning Lecture Notes",
      description: "Comprehensive notes on supervised learning, SVMs, and kernel methods.",
      resourceUrl: "https://cs229.stanford.edu/notes2022fall/cs229-notes1.pdf",
      materialType: "NOTES",
      createdAt: new Date().toISOString(),
    },
  ],
  "c-cnt501": [
    {
      id: "mat-4",
      title: "Computer Networking: A Top-Down Approach (Kurose & Ross)",
      description: "Core reference textbook PDF for transport layer, TCP/UDP, and network layer routing.",
      resourceUrl: "https://gaia.cs.umass.edu/kurose_ross/",
      materialType: "PDF",
      createdAt: new Date().toISOString(),
    },
    {
      id: "mat-5",
      title: "Stanford CS144: Introduction to Computer Networking Lectures",
      description: "Curated video playlist covering protocol design, packet loss, and flow control.",
      resourceUrl: "https://www.youtube.com/playlist?list=PL6RpkC85SLQB3XZjKwh0zL-XlJoxfI32p",
      materialType: "VIDEO",
      createdAt: new Date().toISOString(),
    },
  ],
};

const INITIAL_ASSIGNMENTS: Record<string, AcademicAssignment[]> = {
  "c-cse601": [
    {
      id: "asg-1",
      title: "Assignment 1: Polynomial Regression & Regularization",
      instructions: "Implement L1 (Lasso) and L2 (Ridge) regression from scratch using NumPy. Evaluate MSE on synthetic noisy dataset.",
      dueAt: new Date(Date.now() + 86400000 * 7).toISOString(),
      maxScore: 100,
      createdAt: new Date().toISOString(),
    },
    {
      id: "asg-2",
      title: "Assignment 2: Binary Classification with Split-Conformal Sets",
      instructions: "Train a logistic classifier on student complaints. Compute non-conformity scores and return 90% confidence sets.",
      dueAt: new Date(Date.now() + 86400000 * 14).toISOString(),
      maxScore: 100,
      createdAt: new Date().toISOString(),
    },
  ],
  "c-cnt501": [
    {
      id: "asg-3",
      title: "Lab Assignment: Gilbert-Elliott Channel Simulation",
      instructions: "Write a Python script to simulate a 2-state Markov chain. Compare delivery rates of single vs spaced packet transmissions.",
      dueAt: new Date(Date.now() + 86400000 * 5).toISOString(),
      maxScore: 100,
      createdAt: new Date().toISOString(),
    },
  ],
};

// Helper to load/save JSON from localStorage safely
function load<T>(key: string, fallback: T): T {
  try {
    const val = localStorage.getItem(key);
    return val ? (JSON.parse(val) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    // Ignore quota errors
  }
}

export function demoLogin(input: { email: string; password?: string }): AuthResponse {
  const normEmail = input.email.trim().toLowerCase();
  const isAdmin = normEmail.includes("admin");
  const storedUsers = load<Array<{ name: string; email: string; roles: string[] }>>(DEMO_USERS_KEY, []);
  const matched = storedUsers.find((u) => u.email.toLowerCase() === normEmail);

  let name = matched?.name;
  if (!name) {
    if (isAdmin) name = "CampusConnect Administrator";
    else if (normEmail.startsWith("priya")) name = "Priya Patel";
    else if (normEmail.startsWith("arjun")) name = "Arjun Kumar";
    else {
      const prefix = normEmail.split("@")[0].replace(/[._-]/g, " ");
      name = prefix.replace(/\b\w/g, (c) => c.toUpperCase());
    }
  }

  const user: AuthResponse = {
    token: `demo-jwt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId: matched ? `user-${normEmail.replace(/[^a-z0-9]/g, "")}` : (isAdmin ? "admin-seed-01" : "student-seed-01"),
    name,
    email: normEmail,
    roles: matched?.roles ?? (isAdmin ? ["ADMIN"] : ["STUDENT"]),
  };

  return user;
}

export function demoRegister(input: { name: string; email: string; password?: string }): AuthResponse {
  const normEmail = input.email.trim().toLowerCase();
  const storedUsers = load<Array<{ name: string; email: string; roles: string[] }>>(DEMO_USERS_KEY, []);
  const userRecord = {
    name: input.name.trim(),
    email: normEmail,
    roles: normEmail.includes("admin") ? ["ADMIN"] : ["STUDENT"],
  };
  const filtered = storedUsers.filter((u) => u.email.toLowerCase() !== normEmail);
  filtered.push(userRecord);
  save(DEMO_USERS_KEY, filtered);

  return {
    token: `demo-jwt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId: `user-${Date.now()}`,
    name: userRecord.name,
    email: userRecord.email,
    roles: userRecord.roles,
  };
}

export function demoGetTickets(): Ticket[] {
  return load<Ticket[]>(DEMO_TICKETS_KEY, INITIAL_TICKETS);
}

export function demoCreateTicket(input: {
  title: string;
  description: string;
  category: string;
  priority: string;
  location: string;
}): Ticket {
  const tickets = demoGetTickets();
  const newTicket: Ticket = {
    id: `ticket-${Date.now()}`,
    ticketNumber: `TICK-${Math.floor(1000 + Math.random() * 9000)}`,
    title: input.title,
    description: input.description,
    category: input.category,
    priority: input.priority,
    location: input.location,
    status: "OPEN",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: "Student",
  };
  tickets.unshift(newTicket);
  save(DEMO_TICKETS_KEY, tickets);
  return newTicket;
}

export function demoUpdateTicket(id: string, status: string): Ticket {
  const tickets = demoGetTickets();
  const ticket = tickets.find((t) => t.id === id);
  if (ticket) {
    ticket.status = status;
    ticket.updatedAt = new Date().toISOString();
    save(DEMO_TICKETS_KEY, tickets);
    return ticket;
  }
  return {
    id,
    ticketNumber: "TICK-XXXX",
    title: "Updated ticket",
    description: "",
    category: "Network",
    priority: "MEDIUM",
    status,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: "Student",
  };
}

export function demoGetTicketById(id: string): Ticket {
  const tickets = demoGetTickets();
  const found = tickets.find((t) => t.id === id);
  if (found) return found;
  return INITIAL_TICKETS[0];
}

export function demoGetTicketMessages(ticketId: string): TicketMessage[] {
  const allMessages = load<Record<string, TicketMessage[]>>(DEMO_MESSAGES_KEY, {
    "t-1": [
      {
        id: "m-1",
        ticketId: "t-1",
        senderId: "student-1",
        senderName: "Priya Patel",
        senderRole: "STUDENT",
        body: "Wi-Fi in AB2-301 has been cutting out every 5 minutes during lecture.",
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        id: "m-2",
        ticketId: "t-1",
        senderId: "admin-1",
        senderName: "Network Ops",
        senderRole: "ADMIN",
        body: "Acknowledged. Bayesian Fault Localizer flagged AP-AB2-301 with 94.2% failure probability. Field technician dispatched.",
        createdAt: new Date(Date.now() - 1800000).toISOString(),
      },
    ],
  });
  return allMessages[ticketId] ?? [
    {
      id: "m-default",
      ticketId,
      senderId: "system",
      senderName: "CampusConnect Helpdesk",
      senderRole: "ADMIN",
      body: "Ticket received. Our network diagnostics engine is analyzing spatial telemetry.",
      createdAt: new Date().toISOString(),
    },
  ];
}

export function demoSendTicketMessage(ticketId: string, body: string): TicketMessage {
  const allMessages = load<Record<string, TicketMessage[]>>(DEMO_MESSAGES_KEY, {});
  const msgList = allMessages[ticketId] || [];
  const newMsg: TicketMessage = {
    id: `m-${Date.now()}`,
    ticketId,
    senderId: "user-current",
    senderName: "You",
    senderRole: "STUDENT",
    body,
    createdAt: new Date().toISOString(),
  };
  msgList.push(newMsg);
  allMessages[ticketId] = msgList;
  save(DEMO_MESSAGES_KEY, allMessages);
  return newMsg;
}

export function demoGetCourses(): AcademicCourse[] {
  return INITIAL_COURSES;
}

export function demoGetCourse(id: string): AcademicCourse & { materials: AcademicMaterial[]; assignments: AcademicAssignment[] } {
  const course = INITIAL_COURSES.find((c) => c.id === id || c.code.toLowerCase() === id.toLowerCase()) || INITIAL_COURSES[0];
  const materials = INITIAL_MATERIALS[course.id] || [
    {
      id: `mat-${course.id}-1`,
      title: `${course.title} — Lecture Notes & Syllabus Overview`,
      description: "Official course curriculum and reference materials.",
      resourceUrl: "https://www.youtube.com/results?search_query=" + encodeURIComponent(course.title + " nptel"),
      materialType: "LINK",
      createdAt: new Date().toISOString(),
    },
  ];
  const assignments = INITIAL_ASSIGNMENTS[course.id] || [
    {
      id: `asg-${course.id}-1`,
      title: "Mid-Term Comprehensive Assignment",
      instructions: "Complete all problem sets in Unit 1 and Unit 2. Submit source code and laboratory documentation.",
      dueAt: new Date(Date.now() + 86400000 * 7).toISOString(),
      maxScore: 100,
      createdAt: new Date().toISOString(),
    },
  ];
  return { ...course, materials, assignments };
}

export function demoGetEnrollments(): AcademicCourse[] {
  const enrolledIds = load<string[]>(DEMO_ENROLLMENTS_KEY, ["c-cse601", "c-cnt501"]);
  return INITIAL_COURSES.filter((c) => enrolledIds.includes(c.id) || (c.sectionId && enrolledIds.includes(c.sectionId)));
}

export function demoEnrollSection(sectionId: string): { status: string } {
  const enrolledIds = load<string[]>(DEMO_ENROLLMENTS_KEY, ["c-cse601", "c-cnt501"]);
  if (!enrolledIds.includes(sectionId)) {
    enrolledIds.push(sectionId);
    save(DEMO_ENROLLMENTS_KEY, enrolledIds);
  }
  return { status: "ENROLLED" };
}

export function demoGetNotices(): AcademicNotice[] {
  return [
    {
      id: "n-1",
      code: "CNT501",
      courseTitle: "Computer Networks",
      title: "CNT501 Lab Exam & Visual Simulator Demo",
      body: "Practical evaluation on Gilbert-Elliott burst loss and RFC 6298 RTO timer race will be conducted during your scheduled lab hour.",
      publishedAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: "n-2",
      code: "CSE601",
      courseTitle: "Machine Learning",
      title: "Assignment 1 Submission Portal Open",
      body: "Polynomial regression and conformal uncertainty assignment is due next week. Submit Jupyter notebooks via portal.",
      publishedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: "n-3",
      title: "Campus-Wide Wi-Fi Firmware Upgrade",
      body: "IT Services will deploy 802.11ax firmware patches to Academic Block 2 between 02:00 AM - 04:00 AM tonight.",
      publishedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
  ];
}

export function demoGetDiscussions(courseId: string): AcademicDiscussion[] {
  const allDiscussions = load<Record<string, AcademicDiscussion[]>>(DEMO_DISCUSSIONS_KEY, {
    "c-cse601": [
      {
        id: "d-1",
        authorId: "u-1",
        authorName: "Arjun Kumar",
        body: "Can someone clarify how the non-conformity score is computed for the conformal prediction set?",
        createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      },
      {
        id: "d-2",
        authorId: "u-2",
        authorName: "Priya Patel",
        body: "It uses the 1 - p(y|x) softmax residual on the calibration set. Check Unit 8 slides!",
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
    ],
  });
  return allDiscussions[courseId] || [
    {
      id: "d-default",
      authorId: "u-inst",
      authorName: "Teaching Assistant",
      body: "Welcome to the section discussion room. Post any queries regarding assignments or lecture topics here.",
      createdAt: new Date().toISOString(),
    },
  ];
}

export function demoAddDiscussion(courseId: string, body: string, parentId?: string): AcademicDiscussion {
  const allDiscussions = load<Record<string, AcademicDiscussion[]>>(DEMO_DISCUSSIONS_KEY, {});
  const list = allDiscussions[courseId] || [];
  const newPost: AcademicDiscussion = {
    id: `d-${Date.now()}`,
    parentId,
    authorId: "u-current",
    authorName: "You",
    body,
    createdAt: new Date().toISOString(),
  };
  list.push(newPost);
  allDiscussions[courseId] = list;
  save(DEMO_DISCUSSIONS_KEY, allDiscussions);
  return newPost;
}

export function demoGetIncidents(): Incident[] {
  return [
    {
      id: "inc-1",
      incidentNumber: "INC-2026-088",
      status: "ACTIVE",
      category: "HARDWARE_FAILURE",
      severity: "HIGH",
      impactScore: 78,
      rootCauseNode: "AP-AB2-301",
      rootCauseConfidence: 0.942,
      propagationProbability: 0.12,
      estimatedAffectedUsers: 140,
      startedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      detectedAt: new Date(Date.now() - 3600000 * 1.8).toISOString(),
      linkedTicketCount: 14,
      explanation: "Access Point AP-AB2-301 silent under Informative Missingness; 14 tickets in AB2-3 zone; upstream building switch healthy.",
    },
    {
      id: "inc-2",
      incidentNumber: "INC-2026-087",
      status: "INVESTIGATING",
      category: "DEMAND_SURGE",
      severity: "MEDIUM",
      impactScore: 45,
      rootCauseNode: "AP-AUD-01",
      rootCauseConfidence: 0.68,
      propagationProbability: 0.05,
      estimatedAffectedUsers: 450,
      startedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      detectedAt: new Date(Date.now() - 3600000 * 4.9).toISOString(),
      linkedTicketCount: 6,
      explanation: "Auditorium crowd event surge detected. Upstream core and distribution switches healthy; suppressed hardware alarms via surge guard.",
    },
  ];
}

export function demoGetNetworkNodes(): NetworkNode[] {
  return [
    { id: "n-core-01", nodeId: "CORE-01", name: "Campus Core Router 01", type: "CORE_ROUTER", building: "Central", status: "HEALTHY" },
    { id: "n-rtr-01", nodeId: "RTR-01", name: "Border Gateway Router", type: "CORE_ROUTER", building: "Central", status: "HEALTHY" },
    { id: "n-sw-ab2-01", nodeId: "SW-AB2-01", name: "AB2 Distribution Switch", type: "BUILDING_SWITCH", building: "AB2", status: "HEALTHY" },
    { id: "n-ap-ab2-301", nodeId: "AP-AB2-301", name: "AB2 3rd Floor East AP", type: "ACCESS_POINT", building: "AB2", floor: "3", status: "DEGRADED" },
    { id: "n-ap-ab2-302", nodeId: "AP-AB2-302", name: "AB2 3rd Floor West AP", type: "ACCESS_POINT", building: "AB2", floor: "3", status: "HEALTHY" },
    { id: "n-sw-lib-01", nodeId: "SW-LIB-01", name: "Library Main Switch", type: "BUILDING_SWITCH", building: "Library", status: "HEALTHY" },
    { id: "n-ap-lib-01", nodeId: "AP-LIB-01", name: "Library Reading Hall AP", type: "ACCESS_POINT", building: "Library", floor: "1", status: "HEALTHY" },
  ];
}

export function demoGetNetworkTelemetry(): NetworkTelemetry[] {
  return [
    { nodeId: "AP-AB2-301", name: "AB2 3rd Floor East AP", type: "ACCESS_POINT", building: "AB2", floor: "3", status: "DEGRADED", packetLoss: 0.85, rttMs: 240, jitterMs: 55, activeConnections: 8 },
    { nodeId: "AP-AB2-302", name: "AB2 3rd Floor West AP", type: "ACCESS_POINT", building: "AB2", floor: "3", status: "HEALTHY", packetLoss: 0.01, rttMs: 14, jitterMs: 3, activeConnections: 42 },
    { nodeId: "SW-AB2-01", name: "AB2 Distribution Switch", type: "BUILDING_SWITCH", building: "AB2", status: "HEALTHY", packetLoss: 0.0, rttMs: 2, jitterMs: 0.5, activeConnections: 240 },
    { nodeId: "CORE-01", name: "Campus Core Router 01", type: "CORE_ROUTER", building: "Central", status: "HEALTHY", packetLoss: 0.0, rttMs: 1, jitterMs: 0.2, activeConnections: 1250 },
  ];
}

export function demoAskAssistant(message: string): AssistantResponse {
  const lower = message.toLowerCase();
  if (lower.includes("wifi") || lower.includes("wi-fi") || lower.includes("connect")) {
    return {
      answer: "To connect to campus Wi-Fi:\n\n1. Select SSID: **VIT-Student** (or **VIT-Faculty**).\n2. Security type: **WPA2-Enterprise / 802.1X PEAP**.\n3. Phase 2 inner authentication: **MSCHAPv2**.\n4. Enter your institutional email (e.g. `yourname@vit.edu`) as identity and your campus portal password.\n5. If prompted for CA certificate, select *Use system certificates* or *Do not validate*.",
      intent: "WIFI_CONNECTIVITY",
      sources: ["wifi_policy.md", "campus_network_guide.md"],
      mode: "GROUNDED_RAG",
    };
  }
  if (lower.includes("ticket") || lower.includes("complaint") || lower.includes("report")) {
    return {
      answer: "You can report Wi-Fi or infrastructure issues under the **Tickets** page. Be sure to select your exact campus building and floor (e.g. `AB2 - 3rd Floor`) so our Bayesian Fault Localizer can pinpoint the affected Access Point.",
      intent: "TICKET_ASSISTANCE",
      sources: ["helpdesk_triage.md"],
      mode: "GROUNDED_RAG",
    };
  }
  if (lower.includes("lab") || lower.includes("cnt") || lower.includes("burst")) {
    return {
      answer: "The **CNT Visual Lab** (`/lab`) lets you simulate wireless packet loss under the Gilbert-Elliott 2-state Markov model, compare spaced UDP transmissions against back-to-back copies, and test the RFC 6298 adaptive retransmission timeout (RTO) race.",
      intent: "ACADEMIC_LAB",
      sources: ["cnt501_syllabus.md", "protocol_v2_spec.md"],
      mode: "GROUNDED_RAG",
    };
  }
  return {
    answer: `CampusConnect Assistant: I found information regarding your query "${message}".\n\nFor official academic policies, subject timetables, and campus infrastructure support, please browse the Academics Hub or file a ticket in the Support Helpdesk.`,
    intent: "GENERAL_QUERY",
    sources: ["campus_faq.md"],
    mode: "GROUNDED_RAG",
  };
}

export function demoGetMetrics(): NetworkMetrics {
  return {
    websocket: { activeConnections: 42 },
    transports: {
      tcp: { connected: true, sent: 1240, acknowledged: 1238, failed: 2 },
      udp: { sent: 860, failed: 12 },
    },
  };
}

export function demoSendEmergencyAlert(payload: { type: string; severity: string; location: string; message: string }): EmergencyDispatchResponse {
  return {
    deliveryStatus: "DELIVERED",
    latencyMs: 38,
    attempts: [
      { mid: "emg-" + Date.now(), rnd: 1, cpy: 1, seq: 104, sentAt: Date.now() - 38, bytes: 142, ackAt: Date.now(), rtoMsUsed: 120 },
    ],
    decision: {
      action: "SPACED_UDP_CANCEL_ON_ACK",
      source: "learned",
      safe: ["LOCAL_DURABLE_SQLITE_WAL"],
      reason: "Burst loss mitigated by spaced copy; ACK confirmed on attempt 1",
    },
    clock: { offsetMs: 2, delayMs: 14 },
  };
}
