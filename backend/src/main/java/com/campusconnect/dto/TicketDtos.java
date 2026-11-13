package com.campusconnect.dto;

import java.time.Instant;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class TicketDtos {
    private TicketDtos() {}

    public record CreateTicketRequest(
            @NotBlank @Size(max = 160) String title,
            @NotBlank @Size(max = 10000) String description,
            @NotBlank @Size(max = 50) String category,
            @Size(max = 20) String priority,
            @Size(max = 160) String location
    ) {}

    public record UpdateTicketRequest(@NotBlank String status) {}

    public record TicketResponse(
            UUID id,
            String ticketNumber,
            String title,
            String description,
            String category,
            String priority,
            String status,
            String location,
            UUID createdBy,
            Instant createdAt,
            Instant updatedAt
    ) {}
}
