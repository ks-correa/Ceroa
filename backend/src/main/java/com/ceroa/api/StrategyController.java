package com.ceroa.api;

import com.ceroa.api.dto.StrategyComparisonResponse;
import com.ceroa.service.StrategyService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;
import com.ceroa.domain.StrategyType;

@RestController
@RequestMapping("/api/v1/strategies")
public class StrategyController {
    private final StrategyService service;

    public StrategyController(StrategyService service) {
        this.service = service;
    }

    @GetMapping("/comparison")
    public StrategyComparisonResponse comparison(@RequestParam(required = false) String strategy) {
        return service.compare(strategy == null ? null : StrategyType.fromValue(strategy));
    }
}
