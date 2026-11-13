export type ScenarioName =
  | "normal"
  | "congestion"
  | "high-latency"
  | "packet-loss"
  | "high-utilization"
  | "intermittent-connectivity"
  | "ap-failure"
  | "router-failure"
  | "shared-upstream-failure"
  | "gateway-overload"
  | "multiple-unrelated-failures"
  | "recovery";
export interface GroundTruth { incidentId: string; scenario: ScenarioName; rootCause: string|null; startStep: number; affectedNodes: string[]; severity: "LOW"|"MEDIUM"|"HIGH"|"CRITICAL"; }
export interface Telemetry { timestamp: string; sourceNode: string; destinationNode: string; serviceId: string; packetCount: number; packetLossRate: number; rttMs: number; jitterMs: number; throughputMbps: number; connectionFailures: number; websocketFailures: number; tcpAckLatencyMs: number; udpAckLatencyMs: number; activeConnections: number; cpuPercent: number; memoryPercent: number; gatewayLoad: number; receiverHealth: number; /** True when this row was generated in a degraded state (ground-truth label for datasets). */ isAnomaly: boolean; }
export interface Ticket { id: string; timestamp: string; nodeId: string; category: string; text: string; severity: "LOW"|"MEDIUM"|"HIGH"|"CRITICAL"; incidentId: string; }
export interface SimulationResult { scenario: ScenarioName; seed: number; telemetry: Telemetry[]; tickets: Ticket[]; groundTruth: GroundTruth; }
