package com.campusconnect.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public final class AcademicDtos {
    private AcademicDtos() {}

    public record CourseRequest(
            @NotBlank @Size(max = 30) String code,
            @NotBlank @Size(max = 180) String title,
            @Size(max = 5000) String description,
            @Size(max = 120) String department,
            @Positive Integer credits,
            @NotNull UUID facultyId,
            @NotBlank @Size(max = 40) String term,
            @Size(max = 120) String room,
            @Size(max = 240) String schedule,
            @Positive Integer capacity
    ) {}

    public record MaterialRequest(
            @NotBlank @Size(max = 180) String title,
            @Size(max = 5000) String description,
            @NotBlank @Size(max = 1000) String resourceUrl,
            @Size(max = 40) String materialType
    ) {}

    public record AssignmentRequest(
            @NotBlank @Size(max = 180) String title,
            @NotBlank @Size(max = 10000) String instructions,
            Instant dueAt,
            BigDecimal maxScore
    ) {}

    public record SubmissionRequest(
            @NotBlank @Size(max = 30000) String content,
            @Size(max = 1000) String attachmentUrl
    ) {}

    public record GradeRequest(@NotNull BigDecimal score, @Size(max = 5000) String feedback) {}

    public record DiscussionRequest(
            @NotBlank @Size(max = 10000) String body,
            UUID parentId
    ) {}

    public record NoticeRequest(
            @NotBlank @Size(max = 180) String title,
            @NotBlank @Size(max = 10000) String body,
            Instant expiresAt
    ) {}

    public record RagDocumentRequest(
            @NotBlank @Size(max = 180) String title,
            @NotBlank @Size(max = 50000) String content,
            @Size(max = 1000) String sourceUrl
    ) {}
}
