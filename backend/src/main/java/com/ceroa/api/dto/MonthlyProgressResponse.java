package com.ceroa.api.dto;

import java.math.BigDecimal;

public record MonthlyProgressResponse(
        int year, int month, String status, String detailLevel,
        BigDecimal openingDebt, BigDecimal closingDebt, BigDecimal totalPaid,
        BigDecimal principalReduced, BigDecimal recordedInterest, BigDecimal projectedInterest,
        Integer strategyProgress, Integer registeredPaymentsCount, Integer closedDebtsCount,
        Comparison comparison) {
    public record Comparison(int year, int month, String status, BigDecimal closingDebtChange,
                             BigDecimal totalPaidChange, BigDecimal principalReducedChange,
                             Integer paymentsCountChange, Integer closedDebtsCountChange) {}
}
