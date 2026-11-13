import { simulate } from "./simulator";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
const args = process.argv.slice(2); const get = (key:string, fallback:string) => { const i=args.indexOf(key); return i>=0 ? args[i+1] ?? fallback : fallback; };
const scenario = get("--scenario","normal") as Parameters<typeof simulate>[0], seed = Number(get("--seed","1")), steps = Number(get("--steps","5"));
const result = simulate(scenario, seed, steps);
const output = get("--out", "");
if (output) {
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify(result, null, 2), "utf8");
  const csv = ["scenario,seed,timestamp,node_id,packet_loss_rate,rtt_ms,jitter_ms,throughput_mbps,gateway_load,incident_id,root_cause,is_anomaly"]
    .concat(result.telemetry.map((row) => {
      // Label from the simulator's own degradation decision, not from the affected-node list:
      // intermittent scenarios only degrade on even steps, and high-latency/packet-loss/high-utilization
      // also degrade GW-01 / other APs that are not in groundTruth.affectedNodes.
      return [result.scenario, result.seed, row.timestamp, row.sourceNode, row.packetLossRate, row.rttMs, row.jitterMs, row.throughputMbps, row.gatewayLoad, result.groundTruth.incidentId, result.groundTruth.rootCause ?? "", row.isAnomaly].join(",");
    })).join("\n") + "\n";
  writeFileSync(output.replace(/\.[^.]+$/, "") + ".csv", csv, "utf8");
} else {
  console.log(JSON.stringify(result, null, 2));
}
