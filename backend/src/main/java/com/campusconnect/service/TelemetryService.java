package com.campusconnect.service;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.campusconnect.dto.ResearchDtos;

@Service
public class TelemetryService {
    private final JdbcTemplate jdbc;
    private final MlClient ml;

    public TelemetryService(JdbcTemplate jdbc, MlClient ml) {
        this.jdbc = jdbc;
        this.ml = ml;
    }

    public List<ResearchDtos.NodeResponse> listNodes() {
        return jdbc.query("""
                SELECT id, node_id, name, type, building, floor, room, parent_node_id, service_group, capacity, status
                FROM network_nodes ORDER BY node_id
                """, (rs, row) -> new ResearchDtos.NodeResponse(
                rs.getObject("id", UUID.class), rs.getString("node_id"), rs.getString("name"),
                rs.getString("type"), rs.getString("building"), rs.getString("floor"), rs.getString("room"),
                rs.getObject("parent_node_id", UUID.class), rs.getString("service_group"),
                (Double) rs.getObject("capacity"), rs.getString("status")));
    }

    @Transactional
    public ResearchDtos.TelemetryResponse record(ResearchDtos.TelemetryRequest input) {
        UUID nodeId = jdbc.query("SELECT id FROM network_nodes WHERE node_id = ?",
                rs -> rs.next() ? rs.getObject(1, UUID.class) : null, input.nodeId());
        if (nodeId == null) throw new IllegalArgumentException("Unknown network node");
        Instant observedAt = input.observedAt() == null ? Instant.now() : input.observedAt();
        if (observedAt.isAfter(Instant.now().plusSeconds(60)) || observedAt.isBefore(Instant.now().minusSeconds(86_400))) {
            throw new IllegalArgumentException("Telemetry timestamp must be within the last 24 hours");
        }
        String source = input.source() == null || input.source().isBlank() ? "SIMULATOR" : input.source().trim().toUpperCase();
        if (!List.of("SIMULATOR", "TEST", "ADAPTER").contains(source)) {
            throw new IllegalArgumentException("Telemetry source must be SIMULATOR, TEST, or ADAPTER");
        }
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO network_telemetry
                (id, observed_at, node_id, rtt_ms, jitter_ms, packet_loss, throughput_mbps,
                 active_connections, tcp_ack_latency_ms, udp_ack_latency_ms, websocket_failure_rate,
                 gateway_load, receiver_health, source)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, id, Timestamp.from(observedAt), nodeId, input.rttMs(), input.jitterMs(),
                input.packetLoss(), input.throughputMbps(), input.activeConnections(), input.tcpAckLatencyMs(),
                input.udpAckLatencyMs(), input.websocketFailureRate(), input.gatewayLoad(),
                input.receiverHealth().trim().toUpperCase(), source);
        String status = input.packetLoss() >= 0.15 || input.rttMs() >= 250 || input.gatewayLoad() >= 0.9 ? "CRITICAL"
                : input.packetLoss() >= 0.05 || input.rttMs() >= 100 || input.gatewayLoad() >= 0.75 ? "DEGRADED" : "HEALTHY";
        jdbc.update("UPDATE network_nodes SET status = ?, updated_at = NOW() WHERE id = ?", status, nodeId);

        var features = Map.ofEntries(
                Map.entry("packetLoss", input.packetLoss()),
                Map.entry("rttMs", input.rttMs()),
                Map.entry("jitterMs", input.jitterMs()),
                Map.entry("throughputMbps", input.throughputMbps()),
                Map.entry("connectionFailures", 0),
                Map.entry("websocketFailures", 0),
                Map.entry("tcpAckLatencyMs", input.tcpAckLatencyMs()),
                Map.entry("udpAckLatencyMs", input.udpAckLatencyMs()),
                Map.entry("gatewayLoad", input.gatewayLoad()),
                Map.entry("receiverHealth", input.receiverHealth().equalsIgnoreCase("HEALTHY") ? 1.0 : 0.0),
                Map.entry("tickets5m", 0),
                Map.entry("affectedUsers", 0));
        Map<String, Object> anomaly = ml.post("/api/v1/ml/anomaly", Map.of("nodeId", input.nodeId(), "features", features));
        double score = number(anomaly.get("anomalyScore"), heuristicScore(input));
        boolean anomalous = anomaly.get("isAnomaly") instanceof Boolean value ? value : score >= 0.5;
        @SuppressWarnings("unchecked")
        List<String> evidence = anomaly.get("evidence") instanceof List<?> values
                ? values.stream().map(String::valueOf).toList()
                : List.of("Heuristic telemetry score calculated because the ML service did not return a valid prediction.");
        String model = String.valueOf(anomaly.getOrDefault("modelVersion", "telemetry-heuristic-v1"));
        return new ResearchDtos.TelemetryResponse(id, input.nodeId(), observedAt, input.rttMs(), input.jitterMs(),
                input.packetLoss(), input.throughputMbps(), input.activeConnections(), input.tcpAckLatencyMs(),
                input.udpAckLatencyMs(), input.websocketFailureRate(), input.gatewayLoad(),
                input.receiverHealth(), source, score, anomalous, model, evidence);
    }

    public List<Map<String, Object>> latestTelemetry() {
        return jdbc.queryForList("""
                SELECT DISTINCT ON (n.node_id) n.node_id AS "nodeId", n.name, n.type, n.building, n.floor,
                       n.status, t.observed_at AS "observedAt", t.rtt_ms AS "rttMs", t.jitter_ms AS "jitterMs",
                       t.packet_loss AS "packetLoss", t.throughput_mbps AS "throughputMbps",
                       t.active_connections AS "activeConnections", t.gateway_load AS "gatewayLoad",
                       t.receiver_health AS "receiverHealth", t.source
                FROM network_nodes n LEFT JOIN network_telemetry t ON t.node_id = n.id
                ORDER BY n.node_id, t.observed_at DESC NULLS LAST
                """);
    }

    public Map<String, Double> recentNetworkState() {
        return jdbc.queryForObject("""
                SELECT COALESCE(MAX(packet_loss), 0) AS "packetLoss",
                       COALESCE(MAX(rtt_ms), 0) AS "rttMs",
                       COALESCE(MAX(jitter_ms), 0) AS "jitterMs"
                FROM network_telemetry
                WHERE observed_at >= NOW() - INTERVAL '5 minutes'
                """, (rs, row) -> Map.of(
                "packetLoss", rs.getDouble("packetLoss"),
                "rttMs", rs.getDouble("rttMs"),
                "jitterMs", rs.getDouble("jitterMs")));
    }

    private double heuristicScore(ResearchDtos.TelemetryRequest input) {
        return clamp(Math.max(input.packetLoss() / 0.20,
                Math.max(input.rttMs() / 500.0,
                        Math.max(input.jitterMs() / 200.0,
                                Math.max(input.gatewayLoad(), input.websocketFailureRate())))) * 0.75);
    }

    private double number(Object value, double fallback) {
        return value instanceof Number number ? clamp(number.doubleValue()) : fallback;
    }

    private double clamp(double value) {
        return Math.max(0, Math.min(1, value));
    }
}
