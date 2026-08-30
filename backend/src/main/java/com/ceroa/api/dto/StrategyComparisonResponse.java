package com.ceroa.api.dto;

import com.ceroa.domain.StrategyType;

import java.util.List;
import java.util.UUID;

public record StrategyComparisonResponse(
        StrategyType activeStrategy,
        StrategyStatsResponse snowball,
        StrategyStatsResponse avalanche,
        List<UUID> orderedDebtIds
) {}
