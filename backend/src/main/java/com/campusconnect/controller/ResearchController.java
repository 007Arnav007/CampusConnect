package com.campusconnect.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.campusconnect.dto.ResearchDtos;
import com.campusconnect.entity.Role;
import com.campusconnect.entity.Ticket;
import com.campusconnect.entity.User;
import com.campusconnect.repository.TicketRepository;
import com.campusconnect.service.TelemetryService;
import com.campusconnect.service.DeliveryRecordService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1")
public class ResearchController {
    private final TelemetryService telemetry;
    private final JdbcTemplate jdbc;
    private final TicketRepository tickets;
    private final DeliveryRecordService deliveries;

    public ResearchController(TelemetryService telemetry, JdbcTemplate jdbc, TicketRepository tickets, DeliveryRecordService deliveries) {
        this.telemetry = telemetry;
        this.jdbc = jdbc;
        this.tickets = tickets;
        this.deliveries = deliveries;
    }

    @GetMapping("/network/nodes")
    public List<ResearchDtos.NodeResponse> nodes(Authentication auth) {
        requireOperations(auth);
        return telemetry.listNodes();
    }

    @GetMapping("/network/telemetry/latest")
    public List<Map<String, Object>> latestTelemetry(Authentication auth) {
        requireOperations(auth);
        return telemetry.latestTelemetry();
    }

    @GetMapping("/network/delivery-events")
    public List<Map<String, Object>> recentDeliveries(Authentication auth) {
        requireOperations(auth);
        return deliveries.listRecent(100);
    }

    @GetMapping("/network/traces")
    public List<Map<String, Object>> traces(Authentication auth, @RequestParam(defaultValue = "100") int limit) {
        requireOperations(auth);
        int bounded = Math.max(1, Math.min(500, limit));
        return jdbc.queryForList("""
                SELECT id,trace_id AS "traceId",protocol,event_type AS "eventType",source,destination,status,
                       duration_ms AS "durationMs",metadata,occurred_at AS "timestamp"
                FROM application_trace_events ORDER BY occurred_at DESC LIMIT ?
                """, bounded);
    }

    @PostMapping("/network/telemetry")
    public ResearchDtos.TelemetryResponse ingestTelemetry(
            Authentication auth,
            @Valid @RequestBody ResearchDtos.TelemetryRequest request
    ) {
        requireOperations(auth);
        return telemetry.record(request);
    }

    @GetMapping("/incidents")
    public List<ResearchDtos.IncidentResponse> incidents(Authentication auth) {
        requireOperations(auth);
        return jdbc.query("""
                SELECT i.id, i.incident_number, i.status, i.category, i.severity, i.impact_score,
                       n.node_id AS root_cause_node, i.root_cause_confidence, i.propagation_probability,
                       i.estimated_affected_users, i.started_at, i.detected_at, i.resolved_at,
                       i.explanation::text AS explanation,
                       (SELECT COUNT(*) FROM incident_tickets it WHERE it.incident_id = i.id) AS ticket_count
                FROM incidents i LEFT JOIN network_nodes n ON n.id = i.root_cause_node_id
                ORDER BY i.detected_at DESC LIMIT 200
                """, (rs, row) -> new ResearchDtos.IncidentResponse(
                rs.getObject("id", UUID.class), rs.getString("incident_number"), rs.getString("status"),
                rs.getString("category"), rs.getString("severity"), rs.getDouble("impact_score"),
                rs.getString("root_cause_node"), rs.getDouble("root_cause_confidence"),
                rs.getDouble("propagation_probability"), rs.getInt("estimated_affected_users"),
                rs.getTimestamp("started_at").toInstant(), rs.getTimestamp("detected_at").toInstant(),
                rs.getTimestamp("resolved_at") == null ? null : rs.getTimestamp("resolved_at").toInstant(),
                rs.getInt("ticket_count"), rs.getString("explanation")));
    }

    @GetMapping("/incidents/{incidentId}")
    public ResearchDtos.IncidentResponse incident(Authentication auth, @PathVariable UUID incidentId) {
        requireOperations(auth);
        // Query by id directly: the list endpoint is capped at 200 rows, and anything
        // older must still be retrievable instead of a misleading 404.
        ResearchDtos.IncidentResponse found = jdbc.query("""
                SELECT i.id, i.incident_number, i.status, i.category, i.severity, i.impact_score,
                       n.node_id AS root_cause_node, i.root_cause_confidence, i.propagation_probability,
                       i.estimated_affected_users, i.started_at, i.detected_at, i.resolved_at,
                       i.explanation::text AS explanation,
                       (SELECT COUNT(*) FROM incident_tickets it WHERE it.incident_id = i.id) AS ticket_count
                FROM incidents i LEFT JOIN network_nodes n ON n.id = i.root_cause_node_id
                WHERE i.id = ?
                """, rs -> rs.next() ? new ResearchDtos.IncidentResponse(
                rs.getObject("id", UUID.class), rs.getString("incident_number"), rs.getString("status"),
                rs.getString("category"), rs.getString("severity"), rs.getDouble("impact_score"),
                rs.getString("root_cause_node"), rs.getDouble("root_cause_confidence"),
                rs.getDouble("propagation_probability"), rs.getInt("estimated_affected_users"),
                rs.getTimestamp("started_at").toInstant(), rs.getTimestamp("detected_at").toInstant(),
                rs.getTimestamp("resolved_at") == null ? null : rs.getTimestamp("resolved_at").toInstant(),
                rs.getInt("ticket_count"), rs.getString("explanation")) : null, incidentId);
        if (found == null) throw new IllegalArgumentException("Incident not found");
        return found;
    }

    @GetMapping("/incidents/{incidentId}/tickets")
    public List<Map<String, Object>> incidentTickets(Authentication auth, @PathVariable UUID incidentId) {
        requireOperations(auth);
        return jdbc.queryForList("""
                SELECT t.id, t.ticket_number AS "ticketNumber", t.title, t.category, t.status,
                       it.correlation_score AS "correlationScore", it.membership_reason AS "membershipReason"
                FROM incident_tickets it JOIN tickets t ON t.id = it.ticket_id
                WHERE it.incident_id = ? ORDER BY it.created_at
                """, incidentId);
    }

    @GetMapping("/tickets/{ticketId}/incident")
    public Map<String, Object> incidentForTicket(Authentication auth, @PathVariable UUID ticketId) {
        User user = currentUser(auth);
        Ticket ticket = tickets.findById(ticketId).orElseThrow(() -> new IllegalArgumentException("Ticket not found"));
        if (!ticket.getCreatedBy().equals(user.getId())
                && !user.getRoles().contains(Role.STAFF) && !user.getRoles().contains(Role.ADMIN)) {
            throw new AccessDeniedException("You cannot view this ticket's incident details");
        }
        return jdbc.query("""
                SELECT i.id, i.incident_number AS "incidentNumber", i.status, i.category, i.severity,
                       i.impact_score AS "impactScore", n.node_id AS "rootCauseNode",
                       i.root_cause_confidence AS "rootCauseConfidence",
                       i.propagation_probability AS "propagationProbability",
                       i.estimated_affected_users AS "estimatedAffectedUsers",
                       it.correlation_score AS "correlationScore",
                       (SELECT COUNT(*) FROM incident_tickets peer WHERE peer.incident_id=i.id) AS "linkedTicketCount"
                FROM incident_tickets it JOIN incidents i ON i.id=it.incident_id
                LEFT JOIN network_nodes n ON n.id=i.root_cause_node_id
                WHERE it.ticket_id=?
                """, rs -> {
            if (!rs.next()) return Map.of("linked", false);
            var result = new java.util.LinkedHashMap<String, Object>();
            result.put("linked", true);
            result.put("id", rs.getObject("id", UUID.class));
            for (String field : List.of("incidentNumber", "status", "category", "severity", "rootCauseNode")) {
                result.put(field, rs.getString(field));
            }
            for (String field : List.of("impactScore", "rootCauseConfidence", "propagationProbability", "correlationScore")) {
                result.put(field, rs.getDouble(field));
            }
            result.put("estimatedAffectedUsers", rs.getInt("estimatedAffectedUsers"));
            result.put("linkedTicketCount", rs.getInt("linkedTicketCount"));
            return result;
        }, ticketId);
    }

    private User currentUser(Authentication auth) {
        if (auth == null || !(auth.getPrincipal() instanceof User user)) {
            throw new AccessDeniedException("Authentication is required");
        }
        return user;
    }

    private void requireOperations(Authentication auth) {
        if (auth == null || !(auth.getPrincipal() instanceof User user)
                || !(user.getRoles().contains(Role.STAFF) || user.getRoles().contains(Role.ADMIN))) {
            throw new AccessDeniedException("Operations access is restricted to staff and administrators");
        }
    }
}
