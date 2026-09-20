package com.ceroa.api.dto;

import com.ceroa.domain.DebtStatus;
import com.ceroa.domain.DebtType;
import com.ceroa.domain.ReminderMilestone;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record UpcomingDueResponse(
        UUID debtId,
        String debtName,
        String entity,
        DebtType type,
        BigDecimal amount,
        LocalDate dueDate,
        long daysUntilDue,
        DebtStatus status,
        ReminderMilestone reminderMilestone
) {}

