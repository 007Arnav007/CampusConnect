package com.campusconnect.dto;

import java.time.Instant;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class CommunicationDtos {
    private CommunicationDtos() {}

    public record MessageRequest(@NotBlank @Size(max = 5000) String body) {}

    public record MessageResponse(UUID id, UUID ticketId, UUID senderId, String senderName, String senderRole, String body, Instant createdAt) {}

    public record NotificationResponse(
            UUID id, UUID userId, String type, String title, String body, String resourceType,
            UUID resourceId, Instant readAt, boolean read, Instant createdAt
    ) {}
}
