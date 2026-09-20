package com.ceroa.api.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record NotificationReadResponse(
        UUID id,
        boolean read,
        OffsetDateTime readAt,
        long unreadCount
) {}

