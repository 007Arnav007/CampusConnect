import assert from "node:assert/strict";
import test from "node:test";
import { listNetworkEvents, publishNetworkEvent } from "./event-bus.js";

test("network events are timestamped, newest-first, and trace-filterable", () => {
  const first = publishNetworkEvent({
    traceId: "trace-a",
    protocol: "HTTP",
    eventType: "HTTP_REQUEST_COMPLETED",
    source: "gateway",
    destination: "application",
    status: "SUCCESS",
    metadata: {},
  });
  const second = publishNetworkEvent({
    traceId: "trace-b",
    protocol: "TCP",
    eventType: "TCP_ACKNOWLEDGED",
    source: "gateway",
    destination: "receiver",
    status: "SUCCESS",
    metadata: {},
  });
  assert.ok(first.eventId);
  assert.ok(first.timestamp);
  assert.equal(listNetworkEvents(2)[0].eventId, second.eventId);
  assert.deepEqual(listNetworkEvents(10, "trace-a").map((event) => event.eventId), [first.eventId]);
});

test("network event retention is bounded", () => {
  for (let index = 0; index < 510; index += 1) {
    publishNetworkEvent({
      traceId: `trace-${index}`,
      protocol: "HTTP",
      eventType: "HTTP_REQUEST_COMPLETED",
      source: "gateway",
      destination: "application",
      status: "SUCCESS",
      metadata: {},
    });
  }
  assert.equal(listNetworkEvents(500).length, 500);
});
