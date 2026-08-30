package com.ceroa.api.dto;

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
        String notes
) {}
