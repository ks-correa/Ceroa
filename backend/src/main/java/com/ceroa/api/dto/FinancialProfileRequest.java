package com.ceroa.api.dto;

import com.ceroa.domain.StrategyType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record FinancialProfileRequest(
        @NotNull @DecimalMin(value = "0.01") BigDecimal monthlyIncome,
        @NotNull @DecimalMin(value = "0.00") BigDecimal fixedExpenses,
        @NotNull @DecimalMin(value = "0.00") BigDecimal availableMoney,
        @NotNull @Min(1) Integer totalDeclaredDebts,
        @NotNull StrategyType activeStrategy
) {}
