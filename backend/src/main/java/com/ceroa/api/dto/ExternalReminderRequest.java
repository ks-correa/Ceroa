package com.ceroa.api.dto;

import com.ceroa.domain.ReminderMilestone;

import java.time.LocalDate;
import java.util.UUID;

public record ExternalReminderRequest(
        UUID debtId,
        String title,
        String message,
        LocalDate eventDate,
        String channel,
        String eventKey,
        ReminderMilestone milestone
) {}

