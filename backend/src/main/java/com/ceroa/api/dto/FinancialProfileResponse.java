package com.ceroa.api.dto;

import com.ceroa.domain.StrategyType;

import java.math.BigDecimal;

public record FinancialProfileResponse(
        BigDecimal monthlyIncome,
        BigDecimal fixedExpenses,
        BigDecimal availableMoney,
        BigDecimal paymentCapacity,
        int capacityUsagePercentage,
        int totalDeclaredDebts,
        long registeredDebts,
        boolean incompleteCoverage,
        StrategyType activeStrategy
) {}
