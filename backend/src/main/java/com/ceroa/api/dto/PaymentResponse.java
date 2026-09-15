package com.ceroa.api.dto;

import com.ceroa.domain.DebtStatus;
import com.ceroa.domain.PaymentType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record PaymentResponse(
        UUID id,
        UUID debtId,
        String debtName,
        BigDecimal amount,
        LocalDate date,
        PaymentType type,
        String typeLabel,
        String status,
        String notes,
        BigDecimal debtCurrentBalance,
        DebtStatus debtStatus,
        BigDecimal debtOriginalAmount
) {
    public PaymentResponse(
            UUID id,
            UUID debtId,
            String debtName,
            BigDecimal amount,
            LocalDate date,
            PaymentType type,
            String typeLabel,
            String status,
            String notes) {
        this(id, debtId, debtName, amount, date, type, typeLabel, status, notes, null, null, null);
    }
}

