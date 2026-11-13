package com.campusconnect.dto;

import java.time.Instant;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class UserDtos {
    private UserDtos() {}

    public record UserResponse(
            UUID id,
            String name,
            String email,
            String roles,
            Instant createdAt
    ) {}

    public record UpdateProfileRequest(
            @NotBlank @Size(max = 120) String name
    ) {}
}
