package com.ceroa.api.dto;

import com.ceroa.domain.DebtType;
import com.ceroa.domain.RateType;
import com.ceroa.domain.StrategyType;
import com.ceroa.domain.UserPlan;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record StrategyResponse(
        UserPlan plan,
        StrategyType activeStrategy,
        String status,
        String statusReason,
        boolean hasNonComparableDebts,
        int consideredDebtsCount,
        int totalActiveDebtsCount,
        List<StrategyDebtDto> orderedDebts,
        StrategyDebtDto priorityDebt,
        StrategyProjectionDto summaryProjection,
        StrategyProjectionDto globalProjection,
        StrategyComparisonDto comparison
) {

    public record StrategyDebtDto(
            UUID id,
            String name,
            String entity,
            DebtType type,
            String categoryLabel,
            BigDecimal currentBalance,
            BigDecimal originalAmount,
            BigDecimal interestRate,
            RateType rateType,
            BigDecimal comparableRate,
            boolean isRateComparable,
            String rateReason,
            Integer priority,
            boolean isPriority,
            BigDecimal basePayment,
            BigDecimal extraPayment,
            BigDecimal recommendedPayment,
            BigDecimal projectedInterest,
            BigDecimal projectedPrincipal,
            String estimatedPayoffDate,
            Integer estimatedMonths,
            boolean projectionAvailable
    ) {}

    public record StrategyProjectionDto(
            boolean available,
            String payoffDate,
            Integer months,
            BigDecimal totalInterest,
            BigDecimal totalPrincipal,
            BigDecimal monthlyBudget,
            boolean isEstimated,
            String missingReason
    ) {}

    public record StrategyComparisonDto(
            boolean available,
            StrategyStatsDto snowball,
            StrategyStatsDto avalanche,
            BigDecimal interestDifference,
            Integer monthsDifference,
            String missingReason
    ) {}

    public record StrategyStatsDto(
            BigDecimal totalInterest,
            String payoffDate,
            Integer months,
            List<UUID> orderedDebtIds
    ) {}

    public record StrategyUpdateRequest(
            StrategyType strategy
    ) {}
}

