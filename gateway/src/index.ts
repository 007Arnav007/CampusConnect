import "./env.js";
import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { getTransportMetrics, sendTicketEvent } from "./transport.js";
import { dispatchCriticalTest, loadSnapshot, snapshotStatus } from "./critical.js";
import { parseEmergencyRequest } from "./emergency.js";
import { listNetworkEvents, publishNetworkEvent } from "./event-bus.js";

const port = Number(process.env.GATEWAY_PORT ?? 3001);
const allowedOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: allowedOrigins } });
// S-02: no hard-coded fallback. A missing or short secret stops the process at start-up
// so tokens can never be forged by someone who has only read the repository.
const jwtSecret = process.env.JWT_SECRET ?? "";
if (jwtSecret.length < 32) {
  throw new Error("JWT_SECRET must be set to at least 32 characters (see .env.example and `campusctl env init`).");
}
const internalToken = process.env.INTERNAL_SERVICE_TOKEN ?? "";

io.use((socket, next) => {
  try {
    if (!jwtSecret) throw new Error("JWT secret is not configured");
    const token = socket.handshake.auth?.token;
    if (typeof token !== "string") throw new Error("Authentication token is required");
    const claims = jwt.verify(token, jwtSecret) as { sub?: string; roles?: string[] };
    if (!claims.sub || !Array.isArray(claims.roles)) throw new Error("Invalid authentication claims");
    socket.data.userId = claims.sub;
    socket.data.roles = claims.roles;
    socket.data.token = token;
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
});

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.use((request, response, next) => {
  const started = Date.now();
  const traceId = request.header("x-correlation-id") ?? request.header("x-request-id") ?? randomUUID();
  response.setHeader("X-Correlation-ID", traceId);
  response.on("finish", () => {
    if (!request.path.startsWith("/api/") || request.path.startsWith("/api/v1/network-lab/events")) return;
    const event = publishNetworkEvent({
      traceId,
      protocol: "HTTP",
      eventType: "HTTP_REQUEST_COMPLETED",
      source: "gateway",
      destination: request.path.startsWith("/api/v1/assistant") ? "ai-service" : "application",
      status: response.statusCode < 400 ? "SUCCESS" : "ERROR",
      durationMs: Date.now() - started,
      metadata: {
        method: request.method,
        route: request.path,
        statusCode: response.statusCode,
      },
    });
    io.to("operations").emit("network:event", event);
    io.to("network:events").emit("network:event", event);
    if (internalToken) {
      void fetch(`${process.env.BACKEND_URL ?? "http://localhost:8080"}/api/v1/internal/trace-events`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Internal-Service-Token": internalToken },
        body: JSON.stringify({ ...event, metadata: JSON.stringify(event.metadata) }),
        signal: AbortSignal.timeout(1500)
      }).catch(() => {
        // Durable tracing is advisory; the gateway timeline remains available during backend outage.
      });
    }
  });
  next();
});

app.get("/health", (_request, response) => {
  response.json({ status: "UP", service: "gateway", websocket: io.engine.clientsCount });
});

async function proxyAiRequest(request: express.Request, response: express.Response, upstreamPath = request.originalUrl) {
  const aiUrl = (process.env.AI_SERVICE_URL ?? "http://localhost:5000").replace(/\/+$/, "");
  const headers = new Headers();
  const contentType = request.header("content-type");
  if (contentType) headers.set("content-type", contentType);
  const authorization = request.header("authorization");
  if (authorization) headers.set("authorization", authorization);
  const hasBody = !["GET", "HEAD"].includes(request.method);
  try {
    const upstream = await fetch(`${aiUrl}${upstreamPath}`, {
      method: request.method,
      headers,
      body: hasBody ? JSON.stringify(request.body) : undefined,
      signal: AbortSignal.timeout(Number(process.env.AI_REQUEST_TIMEOUT_MS ?? 20_000))
    });
    const responseType = upstream.headers.get("content-type");
    if (responseType) response.setHeader("content-type", responseType);
    response.status(upstream.status).send(await upstream.text());
  } catch {
    response.status(503).json({
      error: {
        code: "AI_SERVICE_UNAVAILABLE",
        message: "Campus assistant is unavailable. Start the ai-service and check AI_SERVICE_URL."
      }
    });
  }
}

// Keep browser AI requests same-origin with the gateway so local CORS settings
// and Vite's root .env handling cannot break assistant/knowledge fetches.
app.get("/api/v1/assistant/health", (request, response) =>
  proxyAiRequest(request, response, "/health"));
app.use("/api/v1/assistant", (request, response) =>
  proxyAiRequest(request, response));
app.get("/api/v1/knowledge", (request, response) =>
  proxyAiRequest(request, response));

function requireOperationsRole(request: express.Request, response: express.Response, next: express.NextFunction) {
  const header = request.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    response.status(401).json({ error: { code: "UNAUTHORIZED", message: "Authentication is required" } });
    return;
  }

  try {
    if (!jwtSecret) throw new Error("JWT secret is not configured");
    const claims = jwt.verify(header.slice(7), jwtSecret) as { roles?: string[] };
    const roles = claims.roles ?? [];
    if (!roles.includes("STAFF") && !roles.includes("ADMIN")) {
      response.status(403).json({ error: { code: "FORBIDDEN", message: "Operations access is restricted" } });
      return;
    }
    next();
  } catch {
    response.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid authentication token" } });
  }
}

app.get("/api/v1/network/metrics", requireOperationsRole, (_request, response) => {
  response.json({
    websocket: { activeConnections: io.engine.clientsCount },
    transports: getTransportMetrics()
  });
});

app.post("/api/v1/network/inject-fault", requireOperationsRole, (request, response) => {
  const { node, faultType, zone, durationSec } = (request.body || {}) as Record<string, unknown>;
  const traceId = randomUUID();
  const event = publishNetworkEvent({
    traceId,
    protocol: "WEBSOCKET",
    eventType: "FAULT_INJECTED",
    source: "OPERATIONS_CONSOLE",
    destination: typeof node === "string" ? node : "AP-LIB1E1",
    status: "ERROR",
    metadata: {
      node: typeof node === "string" ? node : "AP-LIB1E1",
      faultType: typeof faultType === "string" ? faultType : "CONGESTION_SURGE",
      zone: typeof zone === "string" ? zone : "LIB-1-E",
      durationSec: Number(durationSec) || 60,
      injectedAt: new Date().toISOString(),
    },
  });
  io.to("operations").emit("network:event", event);
  io.to("network:events").emit("network:event", event);
  io.emit("network:event", event);
  response.json({ status: "INJECTED", event });
});

app.get("/api/v1/network-lab/events", requireOperationsRole, async (request, response) => {
  const rawLimit = Number(request.query.limit ?? 100);
  const traceId = typeof request.query.traceId === "string" ? request.query.traceId : undefined;
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(500, rawLimit)) : 100;
  const live = listNetworkEvents(limit, traceId);
  try {
    const durableResponse = await fetch(`${process.env.BACKEND_URL ?? "http://localhost:8080"}/api/v1/network/traces?limit=${limit}`, {
      headers: { Authorization: request.header("authorization") ?? "" },
      signal: AbortSignal.timeout(1500),
    });
    if (durableResponse.ok) {
      const durable = await durableResponse.json() as Array<Record<string, unknown>>;
      response.json([...live, ...durable.map((event) => ({
        ...event,
        eventId: event.id,
        timestamp: event.timestamp,
      }))].sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp))).slice(0, limit));
      return;
    }
  } catch {
    // Return live events if the backend's durable trace store is unavailable.
  }
  response.json(live);
});

app.get("/api/v1/network-lab/traces/:traceId", requireOperationsRole, (request, response) => {
  response.json(listNetworkEvents(500, String(request.params.traceId)));
});

// C13: "Emergency" is now Critical Notice Delivery (TEST MODE). The legacy path is kept as an alias for the existing UI.
const criticalHandler = async (request: express.Request, response: express.Response) => {
  if (process.env.CRITICAL_TEST_MODE !== "true") {
    response.status(403).json({ error: { code: "TEST_MODE_DISABLED", message: "Critical notice delivery is a test-mode protocol study and is disabled in this environment." } });
    return;
  }
  const input = parseEmergencyRequest(request.body);
  if (!input) { response.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Provide a valid category, severity, location, and message." } }); return; }
  const severity = input.severity === "CRITICAL" ? 1 : input.severity === "HIGH" ? 0.8 : input.severity === "MEDIUM" ? 0.5 : 0.2;
  try {
    const { decision, result } = await dispatchCriticalTest({ text: `TEST NOTICE: ${input.message}`.slice(0, 400), zones: [input.location.slice(0, 60)],
      incident: typeof request.body?.incidentId === "string" ? String(request.body.incidentId).slice(0, 64) : undefined, severity, deadlineMs: Number(request.body?.deadlineMs) > 0 ? Math.min(Number(request.body.deadlineMs), 20_000) : 2000 });
    if (!result || result.state !== "DELIVERED_CONFIRMED") {
      // Never claim delivery without a verified ACK. DEGRADED_FALLBACK = stored for retrieval, explicitly unconfirmed.
      response.status(503).json({ error: { code: "DELIVERY_UNCONFIRMED", message: "No authenticated, correlated receiver acknowledgment was confirmed. The notice was not reported as delivered." }, decision, attempts: result?.attempts.length ?? 0, state: result?.state ?? "REFUSED", unconfirmed: true });
      return;
    }
    response.status(200).json({ deliveryStatus: result.state, latencyMs: result.latencyMs, attempts: result.attempts, decision, clock: { offsetMs: result.offsetMs, delayMs: result.delayMs }, snapshot: snapshotStatus() });
  } catch {
    response.status(503).json({ error: { code: "DELIVERY_UNCONFIRMED", message: "No authenticated, correlated receiver acknowledgment was confirmed." }, unconfirmed: true });
  }
};
loadSnapshot();
app.post("/api/v1/delivery/critical-test", requireOperationsRole, criticalHandler);
app.post("/api/v1/network/emergency", requireOperationsRole, criticalHandler);
app.get("/api/v1/delivery/policy", requireOperationsRole, (_req, res) => { res.json({ ...snapshotStatus(), transport: getTransportMetrics() }); });

// Internal service APIs are called server-to-server with a private token.
// Never proxy browser requests to them or attach the gateway's credential.
app.use("/api/v1/internal", (_request, response) => {
  response.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
});

app.use("/api/v1", async (request, response) => {
  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";
  const headers = new Headers();
  const authorization = request.header("authorization");
  if (authorization) headers.set("authorization", authorization);
  headers.set("content-type", "application/json");

  const hasBody = !["GET", "HEAD"].includes(request.method);
  try {
    const upstream = await fetch(`${backendUrl}${request.originalUrl}`, {
      method: request.method,
      headers,
      body: hasBody ? JSON.stringify(request.body) : undefined,
      signal: AbortSignal.timeout(10000)
    });

    const contentType = upstream.headers.get("content-type");
    if (contentType) response.setHeader("content-type", contentType);
    const body = await upstream.text();
    response.status(upstream.status).send(body);
  } catch {
    response.status(503).json({ error: { code: "BACKEND_UNAVAILABLE", message: "Application backend is unavailable" } });
  }
});

io.on("connection", (socket) => {
  socket.join(`user:${socket.data.userId}`);
  const roles = socket.data.roles as string[];
  if (roles.includes("STAFF") || roles.includes("ADMIN")) socket.join("operations");
  socket.on("network:subscribe", () => {
    if (roles.includes("STAFF") || roles.includes("ADMIN")) socket.join("network:events");
  });
  socket.on("ticket:subscribe", async (ticketId: unknown) => {
    if (typeof ticketId !== "string" || !/^[\da-f]{8}-([\da-f]{4}-){3}[\da-f]{12}$/i.test(ticketId)) return;
    try {
      const response = await fetch(`${process.env.BACKEND_URL ?? "http://localhost:8080"}/api/v1/tickets/${ticketId}`, {
        headers: { Authorization: `Bearer ${socket.data.token}` },
        signal: AbortSignal.timeout(3000)
      });
      if (response.ok) socket.join(`ticket:${ticketId}`);
    } catch {
      // Refuse the subscription when backend authorization cannot be verified.
    }
  });
  socket.emit("gateway:ready", { socketId: socket.id });
});

server.listen(port, () => {
  console.log(`CampusConnect gateway listening on ${port}`);
  void dispatchOutbox();
  setInterval(() => { void dispatchOutbox(); }, Math.max(250, Number(process.env.OUTBOX_POLL_INTERVAL_MS ?? 500))).unref();
});

let outboxDispatching = false;
async function dispatchOutbox() {
  if (outboxDispatching || !internalToken) return;
  outboxDispatching = true;
  try {
    const response = await fetch(`${process.env.BACKEND_URL ?? "http://localhost:8080"}/api/v1/internal/outbox/claim`, {
      method: "POST",
      headers: { "X-Internal-Service-Token": internalToken },
      signal: AbortSignal.timeout(1500)
    });
    if (!response.ok) return;
    const events = await response.json() as Array<{
      id: string; eventType: string; aggregateId: string; attempt: number; payload: Record<string, unknown>;
    }>;
    for (const event of events.slice(0, 25)) {
      const ticketId = String(event.payload.ticketId ?? event.aggregateId);
      const ticketNumber = String(event.payload.ticketNumber ?? "");
      const sentAt = new Date().toISOString();
      try {
        const ack = await sendTicketEvent({
          eventId: event.id,
          ticketId,
          ticketNumber,
          eventType: event.eventType,
          attempt: event.attempt
        });
        // The ACK envelope carries st/t2/rid; map them once instead of reading
        // non-existent receivedAt/status/receiverId fields.
        const ackAt = typeof ack.t2 === "number" ? new Date(ack.t2).toISOString() : new Date().toISOString();
        const ackStatus = ack.st === "DUPLICATE" ? "DUPLICATE_ACK" : "DELIVERED_CONFIRMED";
        const receiverId = typeof ack.rid === "string" ? ack.rid : "LOCAL-RECEIVER";
        io.to(`ticket:${ticketId}`).emit("ticket:event", {
          ticketId, ticketNumber, eventType: event.eventType, receivedAt: ackAt
        });
        io.to("operations").emit("ticket:event", {
          ticketId, ticketNumber, eventType: event.eventType, receivedAt: ackAt
        });
        await fetch(`${process.env.BACKEND_URL ?? "http://localhost:8080"}/api/v1/internal/delivery-events`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Internal-Service-Token": internalToken },
          body: JSON.stringify({
            messageId: event.id,
            eventType: event.eventType,
            transport: "TCP",
            policyVersion: "outbox-tcp-ack-v1",
            attempt: event.attempt,
            status: ackStatus,
            sentAt,
            ackAt,
            latencyMs: Math.max(0, Date.parse(ackAt) - Date.parse(sentAt)),
            receiverId
          }),
          signal: AbortSignal.timeout(1500)
        });
        await fetch(`${process.env.BACKEND_URL ?? "http://localhost:8080"}/api/v1/internal/outbox/${event.id}/dispatch`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Internal-Service-Token": internalToken },
          body: JSON.stringify({ status: "PUBLISHED" }),
          signal: AbortSignal.timeout(1500)
        });
      } catch (error) {
        try {
          await fetch(`${process.env.BACKEND_URL ?? "http://localhost:8080"}/api/v1/internal/delivery-events`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Internal-Service-Token": internalToken },
            body: JSON.stringify({
              messageId: event.id,
              eventType: event.eventType,
              transport: "TCP",
              policyVersion: "outbox-tcp-ack-v1",
              attempt: event.attempt,
              status: "FAILED",
              sentAt,
              errorCode: error instanceof Error ? error.name : "TRANSPORT_ERROR"
            }),
            signal: AbortSignal.timeout(1500)
          });
          await fetch(`${process.env.BACKEND_URL ?? "http://localhost:8080"}/api/v1/internal/outbox/${event.id}/dispatch`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Internal-Service-Token": internalToken },
            body: JSON.stringify({ status: "RETRY", error: error instanceof Error ? error.message.slice(0, 500) : "Transport error" }),
            signal: AbortSignal.timeout(1500)
          });
        } catch {
          // Lease recovery returns abandoned PROCESSING events to the queue.
        }
      }
    }
  } catch {
    // Backend outage leaves events durable in the outbox; the next poll retries.
  } finally {
    outboxDispatching = false;
  }
}
