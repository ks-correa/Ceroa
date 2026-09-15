package com.ceroa.api.dto;

import com.ceroa.domain.StrategyType;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public record SimulationRequest(
        @NotNull(message = "La deuda es obligatoria para la simulación.")
        UUID debtId,

        @NotNull(message = "La estrategia de simulación es obligatoria.")
        StrategyType strategy,

        List<SimulationEventRequest> events
) {
    public List<SimulationEventRequest> safeEvents() {
        return events != null ? events : List.of();
    }
}

