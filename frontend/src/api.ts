const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

import {
  demoLogin,
  demoRegister,
  demoGetTickets,
  demoCreateTicket,
  demoUpdateTicket,
  demoGetTicketById,
  demoGetTicketMessages,
  demoSendTicketMessage,
  demoGetCourses,
  demoGetCourse,
  demoGetEnrollments,
  demoEnrollSection,
  demoGetNotices,
  demoGetDiscussions,
  demoAddDiscussion,
  demoGetIncidents,
  demoGetNetworkNodes,
  demoGetNetworkTelemetry,
  demoAskAssistant,
  demoGetMetrics,
  demoSendEmergencyAlert,
} from "./demoStore";

export type AuthResponse = {
  token: string;
  userId: string;
  name: string;
  email: string;
  roles: string[];
};

export type Ticket = {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
};

export type TicketMessage = {
  id: string;
  ticketId: string;
  senderId: string;
  body: string;
  senderName?: string;
  senderRole?: string;
  createdAt: string;
};

export type Notification = {
  id: string;
  userId: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  roles: string;
  createdAt: string;
};

export type KnowledgeArticle = {
  id: string;
  title: string;
  content: string;
  excerpt: string;
};

export type AssistantMessage = {
  role: "user" | "model";
  content: string;
};

export type AssistantResponse = {
  answer: string;
  intent: string;
  sources: string[];
  mode: string;
};

export type AcademicCourse = {
  id: string;
  code: string;
  title: string;
  description: string;
  department: string;
  credits: number;
  facultyId: string;
  facultyName: string;
  sectionId?: string;
  term?: string;
  room?: string;
  schedule?: string;
  capacity?: number;
  enrolled?: number;
};

export type AcademicNotice = {
  id: string;
  courseId?: string;
  code?: string;
  courseTitle?: string;
  title: string;
  body: string;
  publishedAt: string;
  expiresAt?: string;
};

export type AcademicMaterial = {
  id: string;
  title: string;
  description?: string;
  resourceUrl: string;
  materialType: string;
  createdAt: string;
};

export type AcademicAssignment = {
  id: string;
  title: string;
  instructions: string;
  dueAt?: string;
  maxScore: number;
  createdAt: string;
};

export type AcademicDiscussion = {
  id: string;
  parentId?: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
};

export type NetworkMetrics = {
  websocket: { activeConnections: number };
  transports: {
    tcp: { connected: boolean; sent: number; acknowledged: number; failed: number };
    udp: { sent: number; failed: number };
  };
};

export type HealthStatus = {
  status: string;
  services?: Record<string, string>;
};

export type EmergencyAlert = {
  id: string;
  type: string;
  severity: string;
  location: string;
  message: string;
  createdAt: string;
};

export type EmergencyDispatchResponse = {
  deliveryStatus: string;
  latencyMs?: number;
  attempts: Array<{
    mid?: string;
    rnd?: number;
    cpy?: number;
    seq?: number;
    sentAt?: number;
    bytes?: number;
    ackAt?: number;
    rtoMsUsed?: number;
  }>;
  decision?: {
    action: string;
    source: "learned" | "static-table" | "refused";
    safe: string[];
    reason: string;
  };
  clock?: { offsetMs?: number; delayMs?: number };
  snapshot?: { mode: string; snapshotId?: string; expiresAt?: number };
  error?: { code: string; message: string };
  unconfirmed?: boolean;
};

export type NetworkNode = {
  id: string;
  nodeId: string;
  name: string;
  type: string;
  building?: string;
  floor?: string;
  room?: string;
  parentNodeId?: string;
  serviceGroup?: string;
  capacity?: number;
  status: string;
};

export type NetworkTelemetry = {
  nodeId: string;
  name: string;
  type: string;
  building?: string;
  floor?: string;
  status: string;
  observedAt?: string;
  rttMs?: number;
  jitterMs?: number;
  packetLoss?: number;
  throughputMbps?: number;
  activeConnections?: number;
  gatewayLoad?: number;
  receiverHealth?: string;
  source?: string;
};

export type Incident = {
  id: string;
  incidentNumber: string;
  status: string;
  category: string;
  severity: string;
  impactScore: number;
  rootCauseNode?: string;
  rootCauseConfidence: number;
  propagationProbability: number;
  estimatedAffectedUsers: number;
  startedAt: string;
  detectedAt: string;
  resolvedAt?: string;
  linkedTicketCount: number;
  explanation: string;
};

export type TicketIncident = {
  linked: boolean;
  id?: string;
  incidentNumber?: string;
  severity?: string;
  impactScore?: number;
  rootCauseNode?: string;
  rootCauseConfidence?: number;
  propagationProbability?: number;
  estimatedAffectedUsers?: number;
  linkedTicketCount?: number;
  correlationScore?: number;
};

export type DeliveryEvent = {
  messageId: string;
  eventType: string;
  transport: string;
  policyVersion?: string;
  attempt: number;
  status: string;
  sentAt?: string;
  ackAt?: string;
  latencyMs?: number;
  receiverId?: string;
  errorCode?: string;
  createdAt: string;
};

export type NetworkLabEvent = {
  eventId: string;
  traceId: string;
  timestamp: string;
  protocol: string;
  eventType: string;
  source: string;
  destination: string;
  status: "SUCCESS" | "ERROR";
  durationMs?: number;
  metadata: Record<string, unknown>;
};

const TOKEN_KEY = "campusconnect.token";
const AUTH_KEY = "campusconnect.auth";

function handleUnauthorized() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(AUTH_KEY);
  window.location.assign("/login");
}

function isNetworkFailure(err: unknown): boolean {
  if (typeof window !== "undefined" && window.location.hostname.includes("github.io")) {
    return true;
  }
  if (err instanceof TypeError) return true;
  if (err instanceof Error) {
    const m = err.message.toLowerCase();
    return m.includes("fetch") || m.includes("network") || m.includes("failed to fetch") || m.includes("connection");
  }
  return false;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    if (response.status === 401 && !path.startsWith("/api/v1/auth/")) {
      handleUnauthorized();
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error?.message ?? payload?.message ?? "Request failed");
    }
    return payload as T;
  } catch (err) {
    if (isNetworkFailure(err)) {
      // Return fallback data for common routes if server is unreachable
      const fallback = getFallbackForPath<T>(path, options);
      if (fallback !== undefined) return fallback;
    }
    throw err;
  }
}

function getFallbackForPath<T>(path: string, options: RequestInit = {}): T | undefined {
  if (path.startsWith("/api/v1/auth/login")) {
    const body = options.body ? JSON.parse(options.body as string) : {};
    return demoLogin(body) as unknown as T;
  }
  if (path.startsWith("/api/v1/auth/register")) {
    const body = options.body ? JSON.parse(options.body as string) : {};
    return demoRegister(body) as unknown as T;
  }
  if (path === "/api/v1/tickets" && (!options.method || options.method === "GET")) {
    return demoGetTickets() as unknown as T;
  }
  if (path === "/api/v1/tickets" && options.method === "POST") {
    const body = options.body ? JSON.parse(options.body as string) : {};
    return demoCreateTicket(body) as unknown as T;
  }
  if (path.startsWith("/api/v1/tickets/") && path.includes("/messages")) {
    const parts = path.split("/");
    const ticketId = parts[4];
    if (options.method === "POST") {
      const body = options.body ? JSON.parse(options.body as string) : {};
      return demoSendTicketMessage(ticketId, body.body) as unknown as T;
    }
    return demoGetTicketMessages(ticketId) as unknown as T;
  }
  if (path.startsWith("/api/v1/tickets/") && options.method === "PATCH") {
    const parts = path.split("/");
    const ticketId = parts[4];
    const body = options.body ? JSON.parse(options.body as string) : {};
    return demoUpdateTicket(ticketId, body.status) as unknown as T;
  }
  if (path.startsWith("/api/v1/tickets/")) {
    const parts = path.split("/");
    const ticketId = parts[4];
    return demoGetTicketById(ticketId) as unknown as T;
  }
  if (path === "/api/v1/academics/courses" && (!options.method || options.method === "GET")) {
    return demoGetCourses() as unknown as T;
  }
  if (path.startsWith("/api/v1/academics/courses/")) {
    const parts = path.split("/");
    const courseId = parts[5];
    if (path.includes("/discussions")) {
      if (options.method === "POST") {
        const body = options.body ? JSON.parse(options.body as string) : {};
        return demoAddDiscussion(courseId, body.body, body.parentId) as unknown as T;
      }
      return demoGetDiscussions(courseId) as unknown as T;
    }
    return demoGetCourse(courseId) as unknown as T;
  }
  if (path === "/api/v1/academics/my-enrollments") {
    return demoGetEnrollments() as unknown as T;
  }
  if (path.includes("/enroll")) {
    const parts = path.split("/");
    const sectionId = parts[5];
    return demoEnrollSection(sectionId) as unknown as T;
  }
  if (path === "/api/v1/academics/notices") {
    return demoGetNotices() as unknown as T;
  }
  if (path === "/api/v1/incidents") {
    return demoGetIncidents() as unknown as T;
  }
  if (path === "/api/v1/network/nodes") {
    return demoGetNetworkNodes() as unknown as T;
  }
  if (path === "/api/v1/network/telemetry/latest") {
    return demoGetNetworkTelemetry() as unknown as T;
  }
  if (path === "/api/v1/notifications") {
    return [] as unknown as T;
  }
  return undefined;
}

export async function register(input: { name: string; email: string; password: string }) {
  try {
    return await request<AuthResponse>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
  } catch (err) {
    if (isNetworkFailure(err)) {
      return demoRegister(input);
    }
    throw err;
  }
}

export async function login(input: { email: string; password: string }) {
  try {
    return await request<AuthResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
  } catch (err) {
    if (isNetworkFailure(err)) {
      return demoLogin(input);
    }
    throw err;
  }
}

export function getTickets() {
  return request<Ticket[]>("/api/v1/tickets");
}

export function getAllTickets() {
  return request<Ticket[]>("/api/v1/tickets");
}

export function createTicket(input: {
  title: string;
  description: string;
  category: string;
  priority: string;
  location: string;
}) {
  return request<Ticket>("/api/v1/tickets", { method: "POST", body: JSON.stringify(input) });
}

export function updateTicket(id: string, status: string) {
  return request<Ticket>(`/api/v1/tickets/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
}

export function getTicketById(id: string) {
  return request<Ticket>(`/api/v1/tickets/${id}`);
}

export function getTicketIncident(id: string) {
  return request<TicketIncident>(`/api/v1/tickets/${id}/incident`).catch(() => ({
    linked: false,
    severity: "LOW",
    impactScore: 10,
    rootCauseConfidence: 0.85,
  }));
}

export function getIncidents() {
  return request<Incident[]>("/api/v1/incidents");
}

export function getDeliveryEvents() {
  return request<DeliveryEvent[]>("/api/v1/network/delivery-events").catch(() => []);
}

export function getNetworkLabEvents(limit = 100) {
  return request<NetworkLabEvent[]>(`/api/v1/network-lab/events?limit=${limit}`).catch(() => []);
}

export function getNetworkNodes() {
  return request<NetworkNode[]>("/api/v1/network/nodes");
}

export function getLatestNetworkTelemetry() {
  return request<NetworkTelemetry[]>("/api/v1/network/telemetry/latest");
}

export function submitNetworkTelemetry(input: {
  nodeId: string;
  observedAt?: string;
  rttMs: number;
  jitterMs: number;
  packetLoss: number;
  throughputMbps: number;
  activeConnections: number;
  tcpAckLatencyMs: number;
  udpAckLatencyMs: number;
  websocketFailureRate: number;
  gatewayLoad: number;
  receiverHealth: string;
  source?: string;
}) {
  return request("/api/v1/network/telemetry", { method: "POST", body: JSON.stringify(input) });
}

export function getTicketMessages(ticketId: string) {
  return request<TicketMessage[]>(`/api/v1/tickets/${ticketId}/messages`);
}

export function sendTicketMessage(ticketId: string, body: string) {
  return request<TicketMessage>(`/api/v1/tickets/${ticketId}/messages`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export function getNotifications() {
  return request<Notification[]>("/api/v1/notifications").catch(() => []);
}

export function markNotificationRead(id: string) {
  return request<void>(`/api/v1/notifications/${id}/read`, { method: "PATCH" }).catch(() => undefined);
}

export function getAllUsers() {
  return request<User[]>("/api/v1/users").catch(() => []);
}

export function getMyProfile() {
  return request<User>("/api/v1/users/me").catch(() => ({
    id: "user-me",
    name: "Student",
    email: "student@vit.edu",
    roles: "STUDENT",
    createdAt: new Date().toISOString(),
  }));
}

export function updateMyProfile(name: string) {
  return request<User>("/api/v1/users/me", {
    method: "PATCH",
    body: JSON.stringify({ name }),
  }).catch(() => ({
    id: "user-me",
    name,
    email: "student@vit.edu",
    roles: "STUDENT",
    createdAt: new Date().toISOString(),
  }));
}

export function getAcademicCourses() {
  return request<AcademicCourse[]>("/api/v1/academics/courses");
}

export function createAcademicCourse(input: {
  code: string;
  title: string;
  description?: string;
  department?: string;
  facultyId: string;
  term: string;
  room?: string;
  schedule?: string;
  credits?: number;
  capacity?: number;
}) {
  return request("/api/v1/academics/courses", { method: "POST", body: JSON.stringify(input) });
}

export function createAcademicMaterial(courseId: string, input: { title: string; description?: string; resourceUrl: string }) {
  return request(`/api/v1/academics/courses/${courseId}/materials`, { method: "POST", body: JSON.stringify(input) });
}

export function createAcademicAssignment(courseId: string, input: { title: string; instructions: string; dueAt?: string; maxScore?: number }) {
  return request(`/api/v1/academics/courses/${courseId}/assignments`, { method: "POST", body: JSON.stringify(input) });
}

export function publishAcademicNotice(input: { title: string; body: string; expiresAt?: string }) {
  return request("/api/v1/academics/notices", { method: "POST", body: JSON.stringify(input) });
}

export function submitAcademicDocument(input: { title: string; content: string; sourceUrl?: string }) {
  return request("/api/v1/academics/documents", { method: "POST", body: JSON.stringify(input) });
}

export function getPendingAcademicDocuments() {
  return request<Array<{ id: string; title: string; content: string; sourceUrl?: string; code?: string }>>("/api/v1/academics/documents/pending").catch(() => []);
}

export function approveAcademicDocument(id: string) {
  return request(`/api/v1/academics/documents/${id}/approve`, { method: "PATCH" });
}

export function getDiscussionsForModeration() {
  return request<Array<{ id: string; code: string; authorName: string; body: string; hidden: boolean }>>("/api/v1/academics/discussions/moderation").catch(() => []);
}

export function moderateAcademicDiscussion(id: string, hidden: boolean) {
  return request(`/api/v1/academics/discussions/${id}/moderate`, { method: "PATCH", body: JSON.stringify({ hidden }) });
}

export function getAcademicCourse(id: string) {
  return request<AcademicCourse & { materials: AcademicMaterial[]; assignments: AcademicAssignment[] }>(`/api/v1/academics/courses/${id}`);
}

export function getAcademicEnrollments() {
  return request<AcademicCourse[]>("/api/v1/academics/my-enrollments");
}

export function enrollAcademicSection(sectionId: string) {
  return request(`/api/v1/academics/sections/${sectionId}/enroll`, { method: "POST" });
}

export function getAcademicNotices() {
  return request<AcademicNotice[]>("/api/v1/academics/notices");
}

export function getAcademicDiscussions(courseId: string) {
  return request<AcademicDiscussion[]>(`/api/v1/academics/courses/${courseId}/discussions`);
}

export function addAcademicDiscussion(courseId: string, body: string, parentId?: string) {
  return request(`/api/v1/academics/courses/${courseId}/discussions`, {
    method: "POST",
    body: JSON.stringify({ body, parentId }),
  });
}

export function submitAcademicAssignment(assignmentId: string, content: string, attachmentUrl?: string) {
  return request(`/api/v1/academics/assignments/${assignmentId}/submit`, {
    method: "POST",
    body: JSON.stringify({ content, attachmentUrl }),
  });
}

export function searchAcademicDocuments(query: string) {
  return request<Array<{ id: string; courseId?: string; title: string; content: string; sourceUrl?: string }>>(`/api/v1/academics/search?q=${encodeURIComponent(query)}`).catch(() => []);
}

export async function getNetworkMetrics() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const response = await fetch(`${API_URL}/api/v1/network/metrics`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) {
      throw new Error(`Network metrics request failed (${response.status})`);
    }
    return (await response.json()) as NetworkMetrics;
  } catch (err) {
    if (isNetworkFailure(err)) return demoGetMetrics();
    throw err;
  }
}

export async function injectNetworkFault(payload: {
  node?: string;
  faultType?: string;
  zone?: string;
  durationSec?: number;
}) {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const response = await fetch(`${API_URL}/api/v1/network/inject-fault`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`Fault injection failed (${response.status})`);
    }
    return await response.json();
  } catch (err) {
    if (isNetworkFailure(err)) {
      return { success: true, message: `Injected fault ${payload.faultType || 'DEMAND_SURGE'} on ${payload.node || 'AP-AB2-301'}` };
    }
    throw err;
  }
}

export async function sendEmergencyAlert(payload: {
  type: string;
  severity: string;
  location: string;
  message: string;
}): Promise<EmergencyDispatchResponse> {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const response = await fetch(`${API_URL}/api/v1/network/emergency`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        category: payload.type,
        severity: payload.severity,
        location: payload.location,
        message: payload.message,
        testOnly: true,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error?.message ?? data?.message ?? "Failed to send emergency alert");
    return data as EmergencyDispatchResponse;
  } catch (err) {
    if (isNetworkFailure(err)) {
      return demoSendEmergencyAlert(payload);
    }
    throw err;
  }
}

export async function getHealthStatus() {
  try {
    const response = await fetch(`${API_URL}/api/v1/health`);
    if (!response.ok) throw new Error("Health check failed");
    return (await response.json()) as HealthStatus;
  } catch (err) {
    if (isNetworkFailure(err)) {
      return { status: "UP (Demo Mode)", services: { backend: "DEMO", gateway: "DEMO" } } as HealthStatus;
    }
    throw err;
  }
}

export async function askAssistant(message: string) {
  try {
    const response = await fetch(`${API_URL}/api/v1/assistant/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error?.message ?? "Assistant request failed");
    return payload as AssistantResponse;
  } catch (err) {
    if (isNetworkFailure(err)) {
      return demoAskAssistant(message);
    }
    throw err;
  }
}

export async function chatWithGemini(messages: AssistantMessage[]) {
  try {
    const response = await fetch(`${API_URL}/api/v1/assistant/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error?.message ?? "Chat request failed");
    return payload as AssistantResponse;
  } catch (err) {
    if (isNetworkFailure(err)) {
      const lastMsg = messages[messages.length - 1]?.content || "";
      return demoAskAssistant(lastMsg);
    }
    throw err;
  }
}

export async function getAssistantHealth() {
  try {
    const response = await fetch(`${API_URL}/api/v1/assistant/health`);
    if (!response.ok) throw new Error("Assistant status unavailable");
    return (await response.json()) as {
      status: string;
      configured: boolean;
      provider: string;
      knowledgeDocuments: number;
    };
  } catch (err) {
    if (isNetworkFailure(err)) {
      return { status: "ONLINE", configured: true, provider: "demo-rag", knowledgeDocuments: 12 };
    }
    throw err;
  }
}

export async function getKnowledgeArticles() {
  try {
    const response = await fetch(`${API_URL}/api/v1/knowledge`);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error?.message ?? "Knowledge articles are unavailable");
    return payload as KnowledgeArticle[];
  } catch (err) {
    if (isNetworkFailure(err)) {
      return [
        { id: "k-1", title: "Campus Wi-Fi Setup Guide", excerpt: "How to connect your laptop and mobile device to the VIT-Student 802.1X PEAP network.", content: "Full guide..." },
        { id: "k-2", title: "Network Incident Reporting", excerpt: "How to submit spatial location tickets to help the Bayesian Fault Localizer.", content: "Full guide..." },
      ];
    }
    throw err;
  }
}
