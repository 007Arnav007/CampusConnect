import { randomUUID } from "node:crypto";

export type NetworkEvent = {
  eventId: string;
  traceId: string;
  timestamp: string;
  protocol: "HTTP" | "TCP" | "UDP" | "WEBSOCKET";
  eventType: string;
  source: string;
  destination: string;
  status: "SUCCESS" | "ERROR";
  durationMs?: number;
  metadata: Record<string, unknown>;
};

const recentEvents: NetworkEvent[] = [];
const MAX_EVENTS = 500;

export function publishNetworkEvent(event: Omit<NetworkEvent, "eventId" | "timestamp">): NetworkEvent {
  const complete = { ...event, eventId: randomUUID(), timestamp: new Date().toISOString() };
  recentEvents.push(complete);
  if (recentEvents.length > MAX_EVENTS) recentEvents.splice(0, recentEvents.length - MAX_EVENTS);
  return complete;
}

export function listNetworkEvents(limit = 100, traceId?: string): NetworkEvent[] {
  const filtered = traceId ? recentEvents.filter((event) => event.traceId === traceId) : recentEvents;
  return filtered.slice(-Math.max(1, Math.min(500, limit))).reverse();
}
