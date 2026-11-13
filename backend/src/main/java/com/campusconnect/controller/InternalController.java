package com.campusconnect.controller;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;

import com.campusconnect.dto.ResearchDtos;
import com.campusconnect.service.DeliveryRecordService;
import com.campusconnect.service.OutboxService;
import com.campusconnect.service.TelemetryService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/internal")
public class InternalController {
    private final OutboxService outbox;
    private final DeliveryRecordService deliveries;
    private final TelemetryService telemetry;
    private final String internalToken;
    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    public InternalController(
            OutboxService outbox,
            DeliveryRecordService deliveries,
            TelemetryService telemetry,
            @Value("${campusconnect.internal-service-token:}") String internalToken,
            JdbcTemplate jdbc,
            ObjectMapper objectMapper
    ) {
        this.outbox = outbox;
        this.deliveries = deliveries;
        this.telemetry = telemetry;
        this.internalToken = internalToken;
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
    }

    @org.springframework.web.bind.annotation.GetMapping("/network-state")
    public java.util.Map<String, Double> networkState(
            @RequestHeader(value = "X-Internal-Service-Token", required = false) String token
    ) {
        authorize(token);
        return telemetry.recentNetworkState();
    }

    @PostMapping("/trace-events")
    public void traceEvent(
            @RequestHeader(value = "X-Internal-Service-Token", required = false) String token,
            @RequestBody Map<String, Object> event
    ) {
        authorize(token);
        String traceId = String.valueOf(event.getOrDefault("traceId", ""));
        String protocol = String.valueOf(event.getOrDefault("protocol", "HTTP"));
        String eventType = String.valueOf(event.getOrDefault("eventType", "UNKNOWN"));
        String source = String.valueOf(event.getOrDefault("source", "unknown"));
        String destination = String.valueOf(event.getOrDefault("destination", "unknown"));
        String status = String.valueOf(event.getOrDefault("status", "ERROR"));
        if (!traceId.matches("[A-Za-z0-9._:-]{1,120}") || traceId.isBlank()) {
            throw new IllegalArgumentException("Invalid trace ID");
        }
        if (protocol.length() > 20 || eventType.length() > 80 || source.length() > 120
                || destination.length() > 120 || status.length() > 20) {
            throw new IllegalArgumentException("Trace event field exceeds its column limit");
        }
        Long durationMs = null;
        Object rawDuration = event.get("durationMs");
        if (rawDuration instanceof Number number) {
            durationMs = Math.max(0L, number.longValue());
        } else if (rawDuration != null) {
            try {
                durationMs = Math.max(0L, Long.parseLong(String.valueOf(rawDuration)));
            } catch (NumberFormatException exception) {
                throw new IllegalArgumentException("durationMs must be a whole number");
            }
        }
        String metadata = json(event.getOrDefault("metadata", Map.of()));
        jdbc.update("""
                INSERT INTO application_trace_events(id,trace_id,protocol,event_type,source,destination,status,duration_ms,metadata,occurred_at)
                VALUES(?,?,?,?,?,?,?, ?, CAST(? AS jsonb), ?)
                """,
                UUID.randomUUID(), traceId, protocol, eventType, source, destination, status,
                durationMs, metadata, java.sql.Timestamp.from(Instant.now()));
    }

    /** The metadata column is jsonb: always serialize maps instead of String.valueOf, which yields invalid JSON. */
    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Trace event metadata is not serializable");
        }
    }

    @PostMapping("/outbox/claim")
    public List<ResearchDtos.OutboxEvent> claimOutbox(
            @RequestHeader(value = "X-Internal-Service-Token", required = false) String token
    ) {
        authorize(token);
        return outbox.claim(25);
    }

    @PostMapping("/outbox/{eventId}/dispatch")
    public void completeOutbox(
            @RequestHeader(value = "X-Internal-Service-Token", required = false) String token,
            @PathVariable java.util.UUID eventId,
            @Valid @RequestBody ResearchDtos.OutboxDispatchRequest request
    ) {
        authorize(token);
        outbox.complete(eventId, request.status(), request.error());
    }

    @PostMapping("/delivery-events")
    public void deliveryEvent(
            @RequestHeader(value = "X-Internal-Service-Token", required = false) String token,
            @Valid @RequestBody ResearchDtos.DeliveryRecordRequest request
    ) {
        authorize(token);
        deliveries.recordDelivery(request.messageId(), request.eventType(), request.transport(),
                request.policyVersion(), request.attempt(), request.status(), request.sentAt(),
                request.ackAt(), request.latencyMs(), request.receiverId(), request.errorCode());
    }

    @PostMapping("/emergency-receipts")
    public ResearchDtos.EmergencyReceiptResponse emergencyReceipt(
            @RequestHeader(value = "X-Internal-Service-Token", required = false) String token,
            @Valid @RequestBody ResearchDtos.EmergencyReceiptRequest request
    ) {
        authorize(token);
        if (request.receivedAt().isBefore(Instant.now().minusSeconds(60))
                || request.receivedAt().isAfter(Instant.now().plusSeconds(10))) {
            throw new IllegalArgumentException("Emergency receipt timestamp is outside the allowed clock window");
        }
        return deliveries.recordEmergencyReceipt(request);
    }

    @PostMapping("/tcp-receipts")
    public ResearchDtos.TcpReceiptResponse tcpReceipt(
            @RequestHeader(value = "X-Internal-Service-Token", required = false) String token,
            @Valid @RequestBody ResearchDtos.TcpReceiptRequest request
    ) {
        authorize(token);
        if (request.receivedAt().isBefore(Instant.now().minusSeconds(60))
                || request.receivedAt().isAfter(Instant.now().plusSeconds(10))) {
            throw new IllegalArgumentException("TCP receipt timestamp is outside the allowed clock window");
        }
        return deliveries.recordTcpReceipt(request);
    }

    private void authorize(String presented) {
        if (internalToken.isBlank() || presented == null
                || !MessageDigest.isEqual(internalToken.getBytes(StandardCharsets.UTF_8), presented.getBytes(StandardCharsets.UTF_8))) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Internal service authentication failed");
        }
    }

}
