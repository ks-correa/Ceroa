package com.ceroa.api;

import com.ceroa.api.dto.FinancialProfileRequest;
import com.ceroa.api.dto.FinancialProfileResponse;
import com.ceroa.api.dto.UserResponse;
import com.ceroa.domain.StrategyType;
import com.ceroa.service.FinancialProfileService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/financial-profile")
public class FinancialProfileController {
    private final FinancialProfileService service;

    public FinancialProfileController(FinancialProfileService service) {
        this.service = service;
    }

    @GetMapping
    public FinancialProfileResponse get() {
        return service.get();
    }

    @PutMapping
    public FinancialProfileResponse update(@Valid @RequestBody FinancialProfileRequest request) {
        return service.update(request);
    }

    @PutMapping("/strategy")
    public FinancialProfileResponse updateStrategy(@RequestParam StrategyType strategy) {
        return service.updateStrategy(strategy);
    }

    @PostMapping("/complete")
    public UserResponse complete() {
        return service.completeInitialSetup();
    }
}

