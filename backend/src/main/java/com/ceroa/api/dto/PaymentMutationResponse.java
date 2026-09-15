package com.ceroa.api.dto;

import com.ceroa.domain.DebtStatus;

import java.math.BigDecimal;
import java.util.UUID;

public record PaymentMutationResponse(
        UUID paymentId,
        UUID debtId,
        String debtName,
        BigDecimal amount,
        BigDecimal debtCurrentBalance,
        DebtStatus debtStatus,
        BigDecimal debtOriginalAmount,
        String message
) {}

