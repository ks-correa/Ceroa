package com.ceroa.api.dto;

import java.math.BigDecimal;

public record StrategyStatsResponse(
        BigDecimal totalInterest,
        String payoffDate,
        int months,
        BigDecimal savingsVsSnowball
) {}
