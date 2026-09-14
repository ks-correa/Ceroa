package com.ceroa.api.dto;

import com.ceroa.domain.StrategyType;

import java.math.BigDecimal;
import java.util.List;

public record DashboardSummaryResponse(
        BigDecimal totalRegisteredDebt,
        int activeDebtCount,
        BigDecimal requiredPaymentsCurrentPeriod,
        boolean hasRequiredPaymentsData,
        DashboardNextDueResponse nextDue,
        List<DashboardNextDueResponse> upcomingDues,
        BigDecimal availableForDebt,
        StrategyType activeStrategy,
        DashboardProgressResponse progress,
        String estimatedDebtFreeDate,
        boolean hasEstimatedDebtFreeDate,
        int totalDeclaredDebts,
        long registeredDebtCount,
        boolean partialCoverage,
        String status
) {}

