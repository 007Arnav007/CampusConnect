package com.campusconnect.service;

import java.util.Map;
import java.util.UUID;
import java.time.Instant;
import java.util.List;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.campusconnect.dto.ResearchDtos;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OutboxService {
    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    public OutboxService(JdbcTemplate jdbc, ObjectMapper objectMapper) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
    }

    public UUID enqueueTicketCreated(UUID ticketId, String ticketNumber) {
        UUID eventId = UUID.randomUUID();
        try {
            String payload = objectMapper.writeValueAsString(Map.of("ticketId", ticketId, "ticketNumber", ticketNumber));
            jdbc.update("""
                    INSERT INTO outbox_events (id, event_type, aggregate_type, aggregate_id, payload)
                    VALUES (?, 'TICKET_CREATED', 'TICKET', ?, CAST(? AS jsonb))
                    """, eventId, ticketId, payload);
            return eventId;
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Could not serialize ticket outbox event", exception);
        }
    }

    @Transactional
    public List<ResearchDtos.OutboxEvent> claim(int limit) {
        jdbc.update("""
                UPDATE outbox_events SET status = 'PENDING', claimed_at = NULL
                WHERE status = 'PROCESSING' AND claimed_at < NOW() - INTERVAL '30 seconds'
                """);
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT id, event_type, aggregate_type, aggregate_id, payload::text AS payload, attempt
                FROM outbox_events
                WHERE status = 'PENDING' AND available_at <= NOW() AND attempt < 5
                ORDER BY created_at
                LIMIT ?
                FOR UPDATE SKIP LOCKED
                """, Math.max(1, Math.min(limit, 100)));
        var events = new java.util.ArrayList<ResearchDtos.OutboxEvent>();
        for (var row : rows) {
            UUID id = (UUID) row.get("id");
            jdbc.update("UPDATE outbox_events SET status = 'PROCESSING', attempt = attempt + 1, claimed_at = NOW() WHERE id = ?", id);
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> payload = objectMapper.readValue((String) row.get("payload"), Map.class);
                events.add(new ResearchDtos.OutboxEvent(id, (String) row.get("event_type"),
                        (String) row.get("aggregate_type"), (UUID) row.get("aggregate_id"), payload,
                        ((Number) row.get("attempt")).intValue() + 1));
            } catch (JsonProcessingException exception) {
                jdbc.update("UPDATE outbox_events SET status = 'FAILED', last_error = 'INVALID_PAYLOAD' WHERE id = ?", id);
            }
        }
        return events;
    }

    @Transactional
    public void complete(UUID eventId, String status, String error) {
        switch (status.toUpperCase()) {
            case "PUBLISHED" -> jdbc.update("""
                    UPDATE outbox_events SET status='PUBLISHED', published_at=NOW(), claimed_at=NULL, last_error=NULL
                    WHERE id=? AND status='PROCESSING'
                    """, eventId);
            case "RETRY" -> jdbc.update("""
                    UPDATE outbox_events
                    SET status=CASE WHEN attempt >= 5 THEN 'FAILED' ELSE 'PENDING' END,
                        claimed_at=NULL, available_at=NOW()+INTERVAL '1 second', last_error=?
                    WHERE id=? AND status='PROCESSING'
                    """, error, eventId);
            case "FAILED" -> jdbc.update("""
                    UPDATE outbox_events SET status='FAILED', claimed_at=NULL, last_error=?
                    WHERE id=? AND status='PROCESSING'
                    """, error, eventId);
            default -> throw new IllegalArgumentException("Unsupported outbox dispatch status");
        }
    }
}
