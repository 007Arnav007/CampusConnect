import { GroundTruth, ScenarioName, SimulationResult, Telemetry, Ticket } from "./types";
import { TOPOLOGY } from "./topology";

class Rng { constructor(private state: number) {} next() { this.state = (this.state * 1664525 + 1013904223) >>> 0; return this.state / 4294967296; } range(a:number,b:number) { return a + (b-a)*this.next(); } }
const names: ScenarioName[] = ["normal","congestion","high-latency","packet-loss","high-utilization","intermittent-connectivity","ap-failure","router-failure","shared-upstream-failure","gateway-overload","multiple-unrelated-failures","recovery"];
export function simulate(scenario: ScenarioName, seed=1, steps=5): SimulationResult {
  if (!names.includes(scenario) || !Number.isInteger(seed) || seed < 0 || steps < 1 || steps > 100) throw new Error("Invalid scenario, seed, or steps");
  const rng = new Rng((seed >>> 0) || 1), now = new Date("2026-01-01T00:00:00.000Z"), telemetry: Telemetry[] = [], tickets: Ticket[] = [];
  const affected = scenario === "ap-failure" ? ["AP-02"] :
    scenario === "router-failure" ? ["RTR-01","SW-01","AP-01","AP-02","AP-03"] :
    scenario === "shared-upstream-failure" ? ["SW-01","AP-01","AP-02","AP-03"] :
    scenario === "gateway-overload" ? ["GW-01"] :
    scenario === "multiple-unrelated-failures" ? ["AP-01","GW-01"] :
    scenario === "normal" ? [] : ["SW-01","AP-01","AP-02","AP-03"];
  const rootCause = scenario === "normal" ? null :
    scenario === "ap-failure" ? "AP-02" :
    scenario === "router-failure" ? "RTR-01" :
    scenario === "gateway-overload" ? "GW-01" :
    scenario === "multiple-unrelated-failures" ? "AP-01,GW-01" :
    scenario === "shared-upstream-failure" ? "SW-01" : "SW-01";
  const severity = scenario === "normal" ? "LOW" : scenario === "gateway-overload" || scenario === "router-failure" || scenario === "shared-upstream-failure" ? "CRITICAL" : "HIGH";
  for (let step=0; step<steps; step++) for (const node of TOPOLOGY.nodes) {
    const affectedNow = scenario === "recovery" ? step < Math.ceil(steps / 2) : true;
    const bad = affected.includes(node) && affectedNow;
    const intermittent = scenario === "intermittent-connectivity" && bad && step % 2 === 0;
    const highLatency = scenario === "high-latency" && (bad || node === "GW-01");
    const packetLoss = scenario === "packet-loss" && (bad || node.startsWith("AP-"));
    const highUtilization = scenario === "high-utilization" && (bad || node.startsWith("AP-"));
    // intermittent-connectivity flaps: affected nodes are degraded only on even steps
    // (previously `bad` degraded them on every step, making the scenario identical to congestion).
    const degraded = scenario === "intermittent-connectivity" ? intermittent : bad || highLatency || packetLoss || highUtilization;
    const gateway = scenario === "gateway-overload" ? .88 + rng.range(0,.1) : highUtilization ? .72 + rng.range(0,.2) : rng.range(.15,.45);
    const loss = packetLoss ? rng.range(.15,.4) : degraded ? rng.range(.08,.25) : rng.range(.001,.01);
    const rtt = highLatency ? rng.range(300,800) : degraded ? rng.range(100,260) : rng.range(10,40);
    telemetry.push({timestamp:new Date(now.getTime()+step*60000).toISOString(),sourceNode:node,destinationNode:"CORE-01",serviceId:"campus-network",packetCount:1000+Math.floor(rng.range(0,100)),packetLossRate:Math.min(1, loss),rttMs:rtt,jitterMs:highLatency ? rng.range(50,160) : degraded ? rng.range(20,70) : rng.range(1,8),throughputMbps:highUtilization ? rng.range(5,25) : degraded ? rng.range(20,60) : rng.range(80,100),connectionFailures:degraded ? Math.floor(rng.range(2,10)) : 0,websocketFailures:scenario==="gateway-overload" ? Math.floor(rng.range(3,15)) : 0,tcpAckLatencyMs:scenario==="gateway-overload" ? rng.range(100,400) : rng.range(10,40),udpAckLatencyMs:rng.range(10,50),activeConnections:scenario==="gateway-overload" ? 1000 : Math.floor(rng.range(20,100)),cpuPercent:scenario==="gateway-overload" ? rng.range(85,99) : highUtilization ? rng.range(80,98) : rng.range(20,60),memoryPercent:rng.range(20,70),gatewayLoad:gateway,receiverHealth:degraded ? rng.range(.5,.9) : rng.range(.95,1),isAnomaly:degraded});
    if (degraded && step === Math.min(1, steps - 1)) tickets.push({id:`T-${scenario}-${seed}-${node}`,timestamp:new Date(now.getTime()+step*60000).toISOString(),nodeId:node,category:"NETWORK",text:`Connectivity degradation near ${node}`,severity:severity as Ticket["severity"],incidentId:`INC-${scenario}-${seed}`});
  }
  const groundTruth: GroundTruth = {incidentId:`INC-${scenario}-${seed}`,scenario,rootCause,startStep:scenario==="normal" ? -1 : 1,affectedNodes:affected,severity};
  return {scenario,seed,telemetry,tickets,groundTruth};
}
