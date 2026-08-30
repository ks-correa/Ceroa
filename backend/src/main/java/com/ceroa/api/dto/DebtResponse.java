package com.ceroa.api.dto;

import com.ceroa.domain.DebtStatus;
import com.ceroa.domain.DebtType;
import com.ceroa.domain.RateType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

public record DebtResponse(
        UUID id,
        String name,
        String entity,
        DebtType type,
        String categoryLabel,
        BigDecimal originalAmount,
        BigDecimal currentBalance,
        BigDecimal interestRate,
        RateType rateType,
        BigDecimal monthlyPayment,
        BigDecimal minimumPayment,
        Integer dueDateDay,
        LocalDate nextDueDate,
        LocalDate disbursementDate,
        Integer termRemainingMonths,
        String accountNumber,
        DebtStatus status,
        String notes,
        String color,
        Map<String, Object> details,
        long paymentCount
) {}
