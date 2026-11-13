package com.campusconnect.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.campusconnect.dto.ResearchDtos;
import com.campusconnect.entity.Ticket;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class IncidentService {
    private static final double CORRELATION_THRESHOLD = 0.80;
    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;
    private final MlClient ml;

    public IncidentService(
            JdbcTemplate jdbc,
            ObjectMapper objectMapper,
            MlClient ml
    ) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
        this.ml = ml;
    }

    @Transactional
    public ResearchDtos.CorrelationResult correlateTicket(Ticket ticket) {
        if (!"IT_NETWORK".equals(ticket.getCategory())) return null;
        Instant now = ticket.getCreatedAt() == null ? Instant.now() : ticket.getCreatedAt();
        String searchableLocation = String.join(" ",
                ticket.getLocation() == null ? "" : ticket.getLocation(),
                ticket.getTitle(), ticket.getDescription());
        UUID rootNodeId = findNodeId(searchableLocation);
        String nodeName = rootNodeId == null ? null : nodeName(rootNodeId);
        var candidates = jdbc.query("""
                SELECT id, incident_number, category, root_cause_node_id, started_at,
                       explanation::text, impact_score, propagation_probability, estimated_affected_users,
                       COALESCE((SELECT string_agg(t.title || ' ' || LEFT(t.description, 500), ' ')
                                 FROM incident_tickets it JOIN tickets t ON t.id = it.ticket_id
                                 WHERE it.incident_id = incidents.id), '') AS ticket_text
                FROM incidents
                WHERE status <> 'RESOLVED' AND category = ?
                  AND detected_at >= ?::timestamptz - INTERVAL '15 minutes'
                ORDER BY detected_at DESC
                LIMIT 100
                """, (rs, row) -> new Candidate(
                rs.getObject("id", UUID.class),
                rs.getString("incident_number"),
                rs.getString("category"),
                rs.getObject("root_cause_node_id", UUID.class),
                rs.getTimestamp("started_at").toInstant(),
                rs.getString("explanation"),
                rs.getDouble("impact_score"),
                rs.getDouble("propagation_probability"),
                rs.getInt("estimated_affected_users"),
                rs.getString("ticket_text")
        ), ticket.getCategory(), java.sql.Timestamp.from(now));

        Candidate best = null;
        double bestScore = 0;
        List<String> bestEvidence = List.of();
        // Fetch candidate-independent node facts once; previously these were re-queried
        // (and re-sent to the ML service) once per candidate inside the scoring loop.
        NodeContext context = new NodeContext(nodeName, latestNodeAnomaly(rootNodeId), networkFeatures(rootNodeId));
        for (Candidate candidate : candidates) {
            var scoring = score(ticket, now, rootNodeId, candidate, context);
            if (scoring.score() > bestScore) {
                best = candidate;
                bestScore = scoring.score();
                bestEvidence = scoring.evidence();
            }
        }

        if (best == null || bestScore < CORRELATION_THRESHOLD) {
            UUID id = UUID.randomUUID();
            String incidentNumber = "INC-" + now.toEpochMilli() + "-" + id.toString().substring(0, 6).toUpperCase(Locale.ROOT);
            double anomaly = latestNodeAnomaly(rootNodeId);
            int affectedUsers = rootNodeId == null ? 1 : nodeCapacity(rootNodeId);
            double impact = clamp(0.20 + anomaly * 0.45 + (Math.min(affectedUsers, 100) / 100.0) * 0.35);
            double propagation = clamp(anomaly * 0.55 + (rootNodeId == null ? 0.10 : connectedNodeCount(rootNodeId) * 0.08));
            String severity = severity(impact);
            var rootPrediction = rootCausePrediction(rootNodeId, anomaly);
            nodeName = rootPrediction.nodeName();
            double rootConfidence = rootPrediction.confidence();
            var impactPrediction = ml.post("/api/v1/ml/impact", Map.of(
                    "affectedUsers", affectedUsers, "affectedNodes", rootNodeId == null ? 0 : connectedNodeCount(rootNodeId),
                    "serviceCriticality", "CRITICAL".equals(ticket.getPriority()) ? 1 : 0.5,
                    "durationMinutes", 0, "ticketVelocity", 1, "predictedPropagation", propagation));
            if (impactPrediction.get("impactScore") instanceof Number number) impact = Math.max(impact, clamp(number.doubleValue()));
            severity = severity(impact);
            var propagationPrediction = propagationPrediction(rootNodeId, anomaly);
            if (propagationPrediction.get("nodeFailureProbability") instanceof Number number) {
                propagation = Math.max(propagation, clamp(number.doubleValue()));
            }
            List<String> evidence = new ArrayList<>();
            evidence.add("Initial incident candidate created from a campus network ticket.");
            if (nodeName != null) evidence.add("Location matched topology node " + nodeName + ".");
            if (anomaly > 0) evidence.add(String.format(Locale.ROOT, "Latest node anomaly score is %.2f.", anomaly));
            UUID predictionId = UUID.randomUUID();
            String evidenceJson = json(evidence);
            jdbc.update("""
                    INSERT INTO incidents
                    (id, incident_number, status, category, severity, impact_score, root_cause_node_id,
                     root_cause_confidence, propagation_probability, estimated_affected_users, explanation, started_at, detected_at)
                    VALUES (?, ?, 'OPEN', ?, ?, ?, ?, ?, ?, ?, CAST(? AS jsonb), ?, ?)
                    """, id, incidentNumber, ticket.getCategory(), severity, impact, rootNodeId,
                    rootConfidence, propagation, affectedUsers,
                    evidenceJson, java.sql.Timestamp.from(now), java.sql.Timestamp.from(now));
            jdbc.update("""
                    INSERT INTO incident_predictions
                    (id, incident_id, model_version, predicted_severity, predicted_root_cause,
                     root_cause_confidence, predicted_propagation, predicted_affected_users, evidence)
                    VALUES (?, ?, 'correlation-heuristic-v1', ?, ?, ?, ?, ?, CAST(? AS jsonb))
                    """, predictionId, id, severity, nodeName, rootConfidence,
                    propagation, affectedUsers, evidenceJson);
            jdbc.update("""
                    INSERT INTO incident_tickets (incident_id, ticket_id, correlation_score, membership_reason)
                    VALUES (?, ?, 1.0, CAST(? AS jsonb))
                    """, id, ticket.getId(), json(Map.of("reason", "initial-network-report", "modelVersion", "correlation-heuristic-v1")));
            return new ResearchDtos.CorrelationResult(id, incidentNumber, 1.0, "CREATED", evidence);
        }

        int existingTicketCount = jdbc.queryForObject(
                "SELECT COUNT(*) FROM incident_tickets WHERE incident_id = ?", Integer.class, best.id());
        int affectedUsers = Math.max(best.estimatedAffectedUsers(), rootNodeId == null ? 1 : nodeCapacity(rootNodeId));
        double impact = clamp(Math.max(best.impactScore(), 0.20 + latestNodeAnomaly(rootNodeId) * 0.45 + Math.min(existingTicketCount + 1, 100) / 100.0 * 0.35));
        double propagation = clamp(Math.max(best.propagationProbability(), latestNodeAnomaly(rootNodeId) * 0.55 + connectedNodeCount(rootNodeId) * 0.08));
        jdbc.update("""
                INSERT INTO incident_tickets (incident_id, ticket_id, correlation_score, membership_reason)
                VALUES (?, ?, ?, CAST(? AS jsonb))
                ON CONFLICT (ticket_id) DO NOTHING
                """, best.id(), ticket.getId(), bestScore, json(Map.of(
                "evidence", bestEvidence, "modelVersion", "correlation-heuristic-v1")));
        jdbc.update("""
                UPDATE incidents
                SET impact_score = GREATEST(impact_score, ?),
                    estimated_affected_users = GREATEST(estimated_affected_users, ?),
                    propagation_probability = GREATEST(propagation_probability, ?),
                    severity = ?, updated_at = NOW()
                WHERE id = ?
                """, impact, affectedUsers, propagation, severity(impact), best.id());
        jdbc.update("""
                INSERT INTO incident_predictions
                (id, incident_id, model_version, predicted_severity, predicted_root_cause,
                 root_cause_confidence, predicted_propagation, predicted_affected_users, evidence)
                VALUES (?, ?, 'correlation-heuristic-v1', ?, ?, ?, ?, ?, CAST(? AS jsonb))
                """, UUID.randomUUID(), best.id(), severity(impact), nodeName, bestScore, propagation, affectedUsers, json(bestEvidence));
        return new ResearchDtos.CorrelationResult(best.id(), best.incidentNumber(), bestScore, "ATTACHED", bestEvidence);
    }

    private RootPrediction rootCausePrediction(UUID rootNodeId, double anomaly) {
        if (rootNodeId == null) return new RootPrediction(null, 0);
        var candidates = jdbc.query("""
                SELECT n.node_id, COUNT(l.id) AS degree
                FROM network_nodes n LEFT JOIN network_links l ON l.source_node_id=n.id OR l.target_node_id=n.id
                GROUP BY n.node_id ORDER BY degree DESC LIMIT 50
                """, (rs, row) -> Map.<String, Object>of(
                "nodeId", rs.getString("node_id"),
                "centrality", Math.min(1, rs.getInt("degree") / 5.0)));
        var output = ml.post("/api/v1/ml/root-cause", Map.of(
                "candidates", candidates,
                "networkState", networkFeatures(rootNodeId),
                "tickets", List.of()));
        Object mlRootCause = output.get("rootCause");
        String selectedNode = mlRootCause == null ? nodeName(rootNodeId) : String.valueOf(mlRootCause);
        Double confidence = output.get("probability") instanceof Number value ? clamp(value.doubleValue()) : clamp(0.45 + anomaly * 0.50);
        return new RootPrediction(selectedNode, confidence);
    }

    private Map<String, Object> propagationPrediction(UUID rootNodeId, double anomaly) {
        if (rootNodeId == null) return Map.of();
        String currentNode = nodeName(rootNodeId);
        if (currentNode == null) return Map.of();
        List<String> neighbors = jdbc.query("""
                SELECT CASE WHEN source.id = ? THEN target.node_id ELSE source.node_id END AS neighbor
                FROM network_links link
                JOIN network_nodes source ON source.id = link.source_node_id
                JOIN network_nodes target ON target.id = link.target_node_id
                WHERE source.id = ? OR target.id = ?
                """, (rs, row) -> rs.getString("neighbor"), rootNodeId, rootNodeId, rootNodeId);
        return ml.post("/api/v1/ml/propagation", Map.of(
                "currentNodes", List.of(currentNode),
                "neighbors", Map.of(currentNode, neighbors),
                "networkState", networkFeatures(rootNodeId)));
    }

    private Scoring score(Ticket ticket, Instant now, UUID rootNodeId, Candidate candidate, NodeContext context) {
        double text = jaccard(ticket.getTitle() + " " + ticket.getDescription(), candidate.ticketText());
        double location = sameLocation(ticket.getLocation(), candidate.rootCauseNodeId());
        double topology = rootNodeId != null && rootNodeId.equals(candidate.rootCauseNodeId()) ? 1 : 0;
        double seconds = Math.max(0, now.getEpochSecond() - candidate.startedAt().getEpochSecond());
        double temporal = clamp(1 - seconds / 900.0);
        double anomaly = context.anomaly();
        double service = ticket.getCategory().equals(candidate.category()) ? 1 : 0;
        double score = 0.20 * text + 0.20 * location + 0.20 * topology
                + 0.15 * temporal + 0.15 * anomaly + 0.10 * service;
        var mlScore = ml.post("/api/v1/ml/correlate", Map.of(
                "ticket", Map.of("id", ticket.getId().toString(), "category", ticket.getCategory(),
                        "location", ticket.getLocation() == null ? "" : ticket.getLocation(),
                        "serviceId", ticket.getCategory(), "text", ticket.getTitle() + " " + ticket.getDescription(),
                        "timestampMinutesAgo", Math.min(15, seconds / 60.0)),
                "activeIncidents", List.of(Map.of("id", candidate.id().toString())),
                "networkState", context.features(),
                "topology", Map.of("location", ticket.getLocation() == null ? "" : ticket.getLocation(),
                        "rootCauseNode", context.nodeName() == null ? "" : context.nodeName())));
        if (mlScore.get("score") instanceof Number number) {
            score = Math.max(score, clamp(number.doubleValue() * 0.85));
        }
        List<String> evidence = new ArrayList<>();
        if (text >= 0.5) evidence.add("Ticket wording is similar to the incident's existing evidence.");
        if (location > 0) evidence.add("Reports map to the same campus location.");
        if (topology > 0) evidence.add("Reports map to the same network topology node.");
        if (temporal >= 0.5) evidence.add("Reports occurred within the configured 15-minute window.");
        if (anomaly > 0.5) evidence.add("Network telemetry for the matched node is anomalous.");
        if (service > 0) evidence.add("Reports use the same support service category.");
        return new Scoring(score, evidence);
    }

    /** Candidate-independent node facts, fetched once per correlation instead of once per candidate. */
    private record NodeContext(String nodeName, double anomaly, Map<String, Object> features) {
        static NodeContext empty() {
            return new NodeContext(null, 0.0, Map.ofEntries(
                    Map.entry("packetLoss", 0), Map.entry("rttMs", 0), Map.entry("jitterMs", 0),
                    Map.entry("throughputMbps", 0), Map.entry("connectionFailures", 0),
                    Map.entry("websocketFailures", 0), Map.entry("tcpAckLatencyMs", 0),
                    Map.entry("udpAckLatencyMs", 0), Map.entry("gatewayLoad", 0),
                    Map.entry("receiverHealth", 1), Map.entry("tickets5m", 1), Map.entry("affectedUsers", 1)));
        }
    }

    private UUID findNodeId(String location) {
        if (location == null || location.isBlank()) return null;
        return jdbc.query("""
                SELECT id FROM network_nodes
                WHERE LOWER(?) LIKE '%' || LOWER(building) || '%'
                   OR (room IS NOT NULL AND LOWER(?) LIKE '%' || LOWER(room) || '%')
                   OR (node_id IS NOT NULL AND LOWER(?) LIKE '%' || LOWER(node_id) || '%')
                ORDER BY CASE WHEN LOWER(?) LIKE '%' || LOWER(node_id) || '%' THEN 0
                              WHEN LOWER(?) LIKE '%' || LOWER(room) || '%' THEN 1
                              WHEN type = 'ACCESS_POINT' THEN 2 ELSE 3 END
                LIMIT 1
                """, rs -> rs.next() ? rs.getObject(1, UUID.class) : null,
                location, location, location, location, location);
    }

    private String nodeName(UUID nodeId) {
        return jdbc.query("SELECT node_id FROM network_nodes WHERE id = ?", rs -> rs.next() ? rs.getString(1) : null, nodeId);
    }

    private int nodeCapacity(UUID nodeId) {
        Integer capacity = jdbc.query("SELECT CEIL(COALESCE(capacity, 1))::integer FROM network_nodes WHERE id = ?",
                rs -> rs.next() ? rs.getInt(1) : null, nodeId);
        return capacity == null ? 1 : Math.max(1, capacity);
    }

    private int connectedNodeCount(UUID nodeId) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM network_links WHERE source_node_id = ? OR target_node_id = ?", Integer.class, nodeId, nodeId);
        return count == null ? 0 : count;
    }

    private double latestNodeAnomaly(UUID nodeId) {
        if (nodeId == null) return 0;
        return jdbc.query("""
                SELECT packet_loss, rtt_ms, jitter_ms, gateway_load, websocket_failure_rate
                FROM network_telemetry WHERE node_id = ? ORDER BY observed_at DESC LIMIT 1
                """, rs -> {
            if (!rs.next()) return 0.0;
            double loss = rs.getDouble("packet_loss");
            double rtt = rs.getDouble("rtt_ms");
            double jitter = rs.getDouble("jitter_ms");
            double load = rs.getDouble("gateway_load");
            double wsFailure = rs.getDouble("websocket_failure_rate");
            return clamp(Math.max(loss / 0.20, Math.max(rtt / 250.0,
                    Math.max(jitter / 80.0, Math.max(load, wsFailure)))) * 0.75);
        }, nodeId);
    }

    private Map<String, Object> networkFeatures(UUID nodeId) {
        if (nodeId == null) return Map.ofEntries(
                Map.entry("packetLoss", 0), Map.entry("rttMs", 0), Map.entry("jitterMs", 0),
                Map.entry("throughputMbps", 0), Map.entry("connectionFailures", 0),
                Map.entry("websocketFailures", 0), Map.entry("tcpAckLatencyMs", 0),
                Map.entry("udpAckLatencyMs", 0), Map.entry("gatewayLoad", 0),
                Map.entry("receiverHealth", 1), Map.entry("tickets5m", 1), Map.entry("affectedUsers", 1));
        return jdbc.query("""
                SELECT packet_loss, rtt_ms, jitter_ms, throughput_mbps, active_connections,
                       tcp_ack_latency_ms, udp_ack_latency_ms, websocket_failure_rate, gateway_load,
                       receiver_health
                FROM network_telemetry WHERE node_id=? ORDER BY observed_at DESC LIMIT 1
                """, rs -> {
            if (!rs.next()) return Map.ofEntries(
                    Map.entry("packetLoss", 0), Map.entry("rttMs", 0), Map.entry("jitterMs", 0),
                    Map.entry("throughputMbps", 0), Map.entry("connectionFailures", 0),
                    Map.entry("websocketFailures", 0), Map.entry("tcpAckLatencyMs", 0),
                    Map.entry("udpAckLatencyMs", 0), Map.entry("gatewayLoad", 0),
                    Map.entry("receiverHealth", 1), Map.entry("tickets5m", 1), Map.entry("affectedUsers", 1));
            return Map.<String, Object>ofEntries(
                    Map.entry("packetLoss", rs.getDouble("packet_loss")),
                    Map.entry("rttMs", rs.getDouble("rtt_ms")),
                    Map.entry("jitterMs", rs.getDouble("jitter_ms")),
                    Map.entry("throughputMbps", rs.getDouble("throughput_mbps")),
                    Map.entry("connectionFailures", 0),
                    Map.entry("websocketFailures", rs.getDouble("websocket_failure_rate") * 10),
                    Map.entry("tcpAckLatencyMs", rs.getDouble("tcp_ack_latency_ms")),
                    Map.entry("udpAckLatencyMs", rs.getDouble("udp_ack_latency_ms")),
                    Map.entry("gatewayLoad", rs.getDouble("gateway_load")),
                    Map.entry("receiverHealth", rs.getString("receiver_health").equalsIgnoreCase("HEALTHY") ? 1 : 0),
                    Map.entry("tickets5m", 1), Map.entry("affectedUsers", rs.getInt("active_connections")));
        }, nodeId);
    }

    private double sameLocation(String location, UUID rootNodeId) {
        if (rootNodeId == null || location == null || location.isBlank()) return 0;
        String building = jdbc.query("SELECT building FROM network_nodes WHERE id = ?", rs -> rs.next() ? rs.getString(1) : null, rootNodeId);
        return building != null && location.toLowerCase(Locale.ROOT).contains(building.toLowerCase(Locale.ROOT)) ? 1 : 0;
    }

    private double jaccard(String first, String second) {
        if (first == null || second == null) return 0;
        var left = java.util.Arrays.stream(first.toLowerCase(Locale.ROOT).split("\\W+"))
                .filter(token -> token.length() > 2).collect(java.util.stream.Collectors.toSet());
        var right = java.util.Arrays.stream(second.toLowerCase(Locale.ROOT).split("\\W+"))
                .filter(token -> token.length() > 2).collect(java.util.stream.Collectors.toSet());
        if (left.isEmpty() || right.isEmpty()) return 0;
        var intersection = new java.util.HashSet<>(left);
        intersection.retainAll(right);
        var union = new java.util.HashSet<>(left);
        union.addAll(right);
        return (double) intersection.size() / union.size();
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Could not serialize incident evidence", exception);
        }
    }

    private String severity(double impact) {
        if (impact >= 0.75) return "CRITICAL";
        if (impact >= 0.50) return "HIGH";
        if (impact >= 0.25) return "MEDIUM";
        return "LOW";
    }

    private double clamp(double value) {
        return Math.max(0, Math.min(1, value));
    }

    private record Candidate(
            UUID id, String incidentNumber, String category, UUID rootCauseNodeId,
            Instant startedAt, String explanation, double impactScore, double propagationProbability,
            int estimatedAffectedUsers, String ticketText
    ) {}

    private record Scoring(double score, List<String> evidence) {}
    private record RootPrediction(String nodeName, double confidence) {}
}
