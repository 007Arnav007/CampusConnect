import assert from "node:assert/strict";
import test from "node:test";
import { parseEmergencyRequest } from "./emergency.js";

test("accepts and normalizes a valid emergency request", () => {
  assert.deepEqual(parseEmergencyRequest({
    category: " fire ",
    severity: "high",
    location: " Main Hall ",
    message: "Smoke reported",
    testOnly: true
  }), {
    category: "FIRE",
    severity: "HIGH",
    location: "Main Hall",
    message: "Smoke reported",
    testOnly: true
  });
});

test("rejects invalid categories, severities, and missing required fields", () => {
  assert.equal(parseEmergencyRequest({ category: "UNKNOWN", severity: "HIGH", location: "Hall", message: "Issue" }), undefined);
  assert.equal(parseEmergencyRequest({ category: "FIRE", severity: "URGENT", location: "Hall", message: "Issue" }), undefined);
  assert.equal(parseEmergencyRequest({ category: "FIRE", severity: "HIGH", location: " ", message: "Issue" }), undefined);
  assert.equal(parseEmergencyRequest({ category: "FIRE", severity: "HIGH", location: "Hall", message: "" }), undefined);
  assert.equal(parseEmergencyRequest({ category: "FIRE", severity: "HIGH", location: "Hall", message: "test", testOnly: false }), undefined);
});

test("rejects overlong fields and malformed caller-supplied IDs", () => {
  assert.equal(parseEmergencyRequest({ category: "FIRE", severity: "HIGH", location: "x".repeat(181), message: "Issue" }), undefined);
  assert.equal(parseEmergencyRequest({ category: "FIRE", severity: "HIGH", location: "Hall", message: "x".repeat(1001) }), undefined);
  assert.equal(parseEmergencyRequest({ alertId: "not-a-uuid", category: "FIRE", severity: "HIGH", location: "Hall", message: "Issue" }), undefined);
});
