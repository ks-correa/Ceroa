package com.ceroa.api.dto;

import com.ceroa.domain.RateType;
import com.ceroa.domain.StrategyType;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record SimulationResponse(
        String status,
        String statusReason,
        SimulationDebtSummaryDto debt,
        StrategyType simulatedStrategy,
        List<String> assumptions,
        SimulationProjectionDto baseline,
        SimulationProjectionDto simulated,
        SimulationDifferencesDto differences,
        List<SimulationPeriodDto> periods
) {
    public record SimulationDebtSummaryDto(
            UUID id,
            String name,
            String entity,
            BigDecimal currentBalance,
            BigDecimal interestRate,
            RateType rateType,
            String categoryLabel
    ) {}

    public record SimulationProjectionDto(
            BigDecimal totalInterest,
            BigDecimal totalPrincipal,
            Integer estimatedMonths,
            String estimatedPayoffDate
    ) {}

    public record SimulationDifferencesDto(
            Integer monthsReduced,
            BigDecimal estimatedInterestSavings
    ) {}

    public record SimulationPeriodDto(
            int period,
            String date,
            BigDecimal openingBalance,
            BigDecimal normalPayment,
            BigDecimal extraPayment,
            BigDecimal interest,
            BigDecimal principal,
            BigDecimal closingBalance
    ) {}

    public static SimulationResponse insufficientData(
            SimulationDebtSummaryDto debt,
            StrategyType strategy,
            List<String> assumptions,
            String reason
    ) {
        return new SimulationResponse(
                "INSUFFICIENT_DATA",
                reason,
                debt,
                strategy,
                assumptions != null ? assumptions : List.of(),
                null,
                null,
                null,
                List.of()
        );
    }
}

