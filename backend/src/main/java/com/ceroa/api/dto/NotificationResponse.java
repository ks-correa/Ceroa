package com.ceroa.api.dto;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record NotificationResponse(
        UUID id,
        String type,
        String title,
        String message,
        LocalDate eventDate,
        UUID relatedDebtId,
        String relatedDebtName,
        boolean read,
        OffsetDateTime readAt,
        String channel,
        String eventKey,
        boolean planRestricted,
        OffsetDateTime createdAt
) {}

