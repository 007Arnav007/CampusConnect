package com.campusconnect.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class ResearchDtos {
    private ResearchDtos() {}

    public record NodeResponse(
            UUID id, String nodeId, String name, String type, String building, String floor, String room,
            UUID parentNodeId, String serviceGroup, Double capacity, String status
    ) {}

    public record TelemetryRequest(
            @NotBlank @Size(max = 100) String nodeId,
            Instant observedAt,
            @Min(0) @Max(600_000) double rttMs,
            @Min(0) @Max(600_000) double jitterMs,
            @Min(0) @Max(1) double packetLoss,
            @Min(0) @Max(1_000_000) double throughputMbps,
            @Min(0) @Max(10_000_000) int activeConnections,
            @Min(0) @Max(600_000) double tcpAckLatencyMs,
            @Min(0) @Max(600_000) double udpAckLatencyMs,
            @Min(0) @Max(1) double websocketFailureRate,
            @Min(0) @Max(1) double gatewayLoad,
            @NotBlank @Size(max = 30) String receiverHealth,
            @Size(max = 40) String source
    ) {}

    public record TelemetryResponse(
            UUID id, String nodeId, Instant observedAt, double rttMs, double jitterMs, double packetLoss,
            double throughputMbps, int activeConnections, double tcpAckLatencyMs, double udpAckLatencyMs,
            double websocketFailureRate, double gatewayLoad, String receiverHealth, String source,
            double anomalyScore, boolean anomalous, String modelVersion, List<String> evidence
    ) {}

    public record IncidentResponse(
            UUID id, String incidentNumber, String status, String category, String severity,
            double impactScore, String rootCauseNode, double rootCauseConfidence,
            double propagationProbability, int estimatedAffectedUsers, Instant startedAt, Instant detectedAt,
            Instant resolvedAt, int linkedTicketCount, String explanation
    ) {}

    public record CorrelationResult(
            UUID incidentId, String incidentNumber, double score, String decision, List<String> evidence
    ) {}

    public record OutboxEvent(
            UUID id, String eventType, String aggregateType, UUID aggregateId,
            Map<String, Object> payload, int attempt
    ) {}

    public record OutboxDispatchRequest(
            @NotBlank @Size(max = 30) String status,
            @Size(max = 500) String error
    ) {}

    public record EmergencyReceiptRequest(
            @NotNull UUID messageId,
            @Min(0) long sequenceNumber,
            @NotBlank @Size(max = 100) String receiverId,
            UUID incidentId,
            @NotBlank @Size(max = 100) String nonce,
            @NotBlank @Size(max = 128) String payloadHash,
            @NotNull Instant receivedAt
    ) {}

    public record EmergencyReceiptResponse(UUID messageId, long sequenceNumber, String receiverId, Instant receivedAt, String status, boolean duplicate) {}

    public record TcpReceiptRequest(
            @NotNull UUID eventId,
            @NotBlank @Size(max = 80) String eventType,
            @NotNull UUID ticketId,
            @NotBlank @Size(max = 100) String receiverId,
            @NotBlank @Size(max = 128) String payloadHash,
            @NotNull Instant receivedAt
    ) {}

    public record TcpReceiptResponse(UUID eventId, String status, String receiverId, Instant receivedAt, boolean duplicate) {}

    public record DeliveryRecordRequest(
            @NotNull UUID messageId,
            @NotBlank @Size(max = 50) String eventType,
            @NotBlank @Size(max = 20) String transport,
            @Size(max = 80) String policyVersion,
            @Min(1) @Max(5) int attempt,
            @NotBlank @Size(max = 30) String status,
            Instant sentAt,
            Instant ackAt,
            @Min(0) Double latencyMs,
            @Size(max = 100) String receiverId,
            @Size(max = 80) String errorCode
    ) {}
}
