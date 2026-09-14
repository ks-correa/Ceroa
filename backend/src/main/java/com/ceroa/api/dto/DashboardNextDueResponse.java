package com.ceroa.api.dto;

import com.ceroa.domain.DebtType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record DashboardNextDueResponse(
        UUID debtId,
        String debtName,
        String entity,
        DebtType debtType,
        BigDecimal amount,
        LocalDate dueDate,
        long daysUntilDue
) {}

