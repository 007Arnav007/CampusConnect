import assert from "node:assert/strict";
import test from "node:test";
import { simulate } from "../src/simulator";
test("same seed is deterministic and includes labels", () => {
  const a=simulate("router-failure", 7, 3), b=simulate("router-failure", 7, 3);
  assert.deepEqual(a,b); assert.equal(a.groundTruth.rootCause,"RTR-01"); assert.ok(a.tickets.length > 0);
});
test("normal scenario has no incident root cause", () => {
  const r=simulate("normal", 2, 2); assert.equal(r.groundTruth.rootCause,null); assert.equal(r.groundTruth.affectedNodes.length,0);
});
test("gateway overload emits gateway telemetry", () => {
  const r=simulate("gateway-overload", 3, 1); assert.ok(r.telemetry.some(x=>x.gatewayLoad > .8 && x.websocketFailures > 0));
});
test("scenario families have explicit labels and one-step incidents emit tickets", () => {
  for (const scenario of ["high-latency", "packet-loss", "high-utilization", "shared-upstream-failure", "multiple-unrelated-failures"] as const) {
    const result = simulate(scenario, 9, 2);
    assert.equal(result.groundTruth.scenario, scenario);
    assert.ok(result.groundTruth.affectedNodes.length > 0);
    assert.ok(result.telemetry.length > 0);
    assert.ok(result.tickets.length > 0);
  }
  assert.ok(simulate("ap-failure", 8, 1).tickets.length > 0);
});
test("recovery scenario labels observations only before recovery", () => {
  const result = simulate("recovery", 5, 6);
  assert.ok(result.telemetry.some((row) => row.receiverHealth < .9));
  assert.ok(result.telemetry.some((row) => row.receiverHealth > .9));
  const nodeCount = new Set(result.telemetry.map((row) => row.sourceNode)).size;
  const early = result.telemetry.slice(0, Math.ceil(6 / 2) * nodeCount);
  const late = result.telemetry.slice(Math.ceil(6 / 2) * nodeCount);
  assert.ok(early.some((row) => row.isAnomaly));
  assert.ok(!late.some((row) => row.isAnomaly));
});
test("telemetry is_anomaly matches the simulator degradation decision, not just the affected list", () => {
  // high-latency also degrades GW-01 (outside groundTruth.affectedNodes)
  const hl = simulate("high-latency", 4, 2);
  assert.ok(hl.groundTruth.affectedNodes.every((n) => !n.startsWith("GW")));
  assert.ok(hl.telemetry.some((row) => row.sourceNode === "GW-01" && row.isAnomaly));
  // intermittent-connectivity only degrades affected nodes on even steps
  const ic = simulate("intermittent-connectivity", 4, 4);
  const apRows = ic.telemetry.filter((row) => row.sourceNode === "AP-01");
  assert.equal(apRows.length, 4);
  const oddStepAnomalies = apRows.filter((row, i) => i % 2 === 1 && row.isAnomaly);
  assert.equal(oddStepAnomalies.length, 0);
  assert.ok(apRows.some((row) => row.isAnomaly));
  // normal scenario never labels anything anomalous
  assert.ok(simulate("normal", 4, 3).telemetry.every((row) => !row.isAnomaly));
});
