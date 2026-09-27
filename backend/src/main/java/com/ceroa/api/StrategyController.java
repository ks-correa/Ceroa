package com.ceroa.api;

import com.ceroa.api.dto.StrategyResponse;
import com.ceroa.api.dto.StrategyResponse.StrategyComparisonDto;
import com.ceroa.api.dto.StrategyResponse.StrategyUpdateRequest;
import com.ceroa.domain.StrategyType;
import com.ceroa.service.StrategyService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/strategies")
public class StrategyController {

    private final StrategyService service;

    public StrategyController(StrategyService service) {
        this.service = service;
    }

    @GetMapping("/active")
    public StrategyResponse getActiveStrategy() {
        return service.getActiveStrategy();
    }

    @PutMapping("/active")
    public StrategyResponse updateActiveStrategy(
            @RequestParam(required = false) StrategyType strategy,
            @RequestBody(required = false) StrategyUpdateRequest body) {
        StrategyType effectiveStrategy = strategy != null ? strategy : (body != null ? body.strategy() : null);
        return service.updateActiveStrategy(effectiveStrategy);
    }

    public record PriorityRequest(java.util.UUID debtId) {}

    @PutMapping("/priority")
    public StrategyResponse updatePriority(@RequestBody PriorityRequest body) {
        return service.updatePriority(body.debtId());
    }

    @GetMapping("/comparison")
    public StrategyComparisonDto getComparison() {
        return service.getComparison();
    }
}
