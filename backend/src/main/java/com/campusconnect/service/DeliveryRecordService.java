package com.campusconnect.service;

import java.time.Instant;
import java.util.UUID;
import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.campusconnect.dto.ResearchDtos;

@Service
public class DeliveryRecordService {
    private final JdbcTemplate jdbc;

    public DeliveryRecordService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Map<String, Object>> listRecent(int limit) {
        return jdbc.queryForList("""
                SELECT message_id AS "messageId", event_type AS "eventType", transport,
                       policy_version AS "policyVersion", attempt, status, sent_at AS "sentAt",
                       ack_at AS "ackAt", latency_ms AS "latencyMs", receiver_id AS "receiverId",
                       error_code AS "errorCode", created_at AS "createdAt"
                FROM delivery_events ORDER BY created_at DESC LIMIT ?
                """, Math.max(1, Math.min(limit, 200)));
    }

    @Transactional
    public ResearchDtos.EmergencyReceiptResponse recordEmergencyReceipt(ResearchDtos.EmergencyReceiptRequest request) {
        var existing = jdbc.query("""
                SELECT sequence_number, receiver_id, received_at, status, nonce, payload_hash
                FROM emergency_receipts WHERE message_id = ?
                """, rs -> rs.next() ? new ResearchDtos.EmergencyReceiptResponse(
                request.messageId(), rs.getLong("sequence_number"), rs.getString("receiver_id"),
                rs.getTimestamp("received_at").toInstant(), rs.getString("status"), true) : null,
                request.messageId());
        if (existing != null) {
            boolean sameReceipt = jdbc.query("""
                    SELECT sequence_number = ? AND receiver_id = ? AND nonce = ? AND payload_hash = ?
                    FROM emergency_receipts WHERE message_id = ?
                    """, rs -> rs.next() && rs.getBoolean(1), request.sequenceNumber(),
                    request.receiverId(), request.nonce(), request.payloadHash(), request.messageId());
            if (!sameReceipt) throw new IllegalArgumentException("Emergency message ID was reused with a different receipt");
            return existing;
        }

        // B-01 fix: the sender owns sequence numbers and the receiver enforces anti-replay with a sliding window.
        // The backend only keeps an informational high-water mark; it never rejects a receipt for being "not newer".
        jdbc.update("""
                INSERT INTO receiver_sequences (receiver_id, last_sequence)
                VALUES (?, ?)
                ON CONFLICT (receiver_id) DO UPDATE
                SET last_sequence = GREATEST(receiver_sequences.last_sequence, EXCLUDED.last_sequence), updated_at = NOW()
                """, request.receiverId(), request.sequenceNumber());

        jdbc.update("""
                INSERT INTO emergency_receipts
                (message_id, sequence_number, receiver_id, incident_id, nonce, payload_hash, received_at, status, duplicate)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'RECEIVED', FALSE)
                """, request.messageId(), request.sequenceNumber(), request.receiverId(), request.incidentId(),
                request.nonce(), request.payloadHash(), java.sql.Timestamp.from(request.receivedAt()));
        return new ResearchDtos.EmergencyReceiptResponse(
                request.messageId(), request.sequenceNumber(), request.receiverId(),
                request.receivedAt(), "RECEIVED", false);
    }

    @Transactional
    public ResearchDtos.TcpReceiptResponse recordTcpReceipt(ResearchDtos.TcpReceiptRequest request) {
        var existing = jdbc.query("""
                SELECT receiver_id, received_at, payload_hash, event_type, ticket_id
                FROM tcp_event_receipts WHERE event_id = ?
                """, rs -> rs.next() ? new ResearchDtos.TcpReceiptResponse(
                request.eventId(), "DUPLICATE_ACK", rs.getString("receiver_id"),
                rs.getTimestamp("received_at").toInstant(), true) : null, request.eventId());
        if (existing != null) {
            boolean sameReceipt = jdbc.query("""
                    SELECT receiver_id = ? AND payload_hash = ? AND event_type = ? AND ticket_id = ?
                    FROM tcp_event_receipts WHERE event_id = ?
                    """, rs -> rs.next() && rs.getBoolean(1), request.receiverId(), request.payloadHash(),
                    request.eventType(), request.ticketId(), request.eventId());
            if (!sameReceipt) throw new IllegalArgumentException("TCP event ID was reused with a different receipt");
            return existing;
        }
        jdbc.update("""
                INSERT INTO tcp_event_receipts
                (event_id, event_type, ticket_id, receiver_id, payload_hash, received_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """, request.eventId(), request.eventType(), request.ticketId(), request.receiverId(),
                request.payloadHash(), java.sql.Timestamp.from(request.receivedAt()));
        return new ResearchDtos.TcpReceiptResponse(
                request.eventId(), "ACKNOWLEDGED", request.receiverId(), request.receivedAt(), false);
    }

    @Transactional
    public void recordDelivery(
            UUID messageId, String eventType, String transport, String policyVersion, int attempt,
            String status, Instant sentAt, Instant ackAt, Double latencyMs, String receiverId, String errorCode
    ) {
        jdbc.update("""
                INSERT INTO delivery_events
                (id, message_id, event_type, transport, policy_version, attempt, sent_at, ack_at,
                 status, latency_ms, receiver_id, error_code)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (message_id, attempt, transport, event_type) DO UPDATE
                SET ack_at = COALESCE(EXCLUDED.ack_at, delivery_events.ack_at),
                    status = EXCLUDED.status,
                    latency_ms = COALESCE(EXCLUDED.latency_ms, delivery_events.latency_ms),
                    receiver_id = COALESCE(EXCLUDED.receiver_id, delivery_events.receiver_id),
                    error_code = EXCLUDED.error_code
                """, UUID.randomUUID(), messageId, eventType, transport, policyVersion, attempt,
                sentAt == null ? null : java.sql.Timestamp.from(sentAt),
                ackAt == null ? null : java.sql.Timestamp.from(ackAt),
                status, latencyMs, receiverId, errorCode);
    }
}
