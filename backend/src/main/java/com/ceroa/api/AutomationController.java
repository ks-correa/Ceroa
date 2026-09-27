package com.ceroa.api;

import com.ceroa.api.dto.*;
import com.ceroa.service.*;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.*;

/** Adapters reuse the existing transactional business services and current-user authorization. */
@RestController
@RequestMapping("/api/v1/automation")
public class AutomationController {
    private final DebtService debts; private final PaymentService payments;
    private final FinancialProfileService profiles; private final DashboardService dashboard;
    private final UpcomingDueService dues; private final MonthlyProgressService monthly;
    private final StrategyService strategies; private final AutomationMutationService mutations;
    public AutomationController(DebtService debts, PaymentService payments, FinancialProfileService profiles,
        DashboardService dashboard, UpcomingDueService dues, MonthlyProgressService monthly,
        StrategyService strategies, AutomationMutationService mutations) {
        this.debts=debts; this.payments=payments; this.profiles=profiles; this.dashboard=dashboard;
        this.dues=dues; this.monthly=monthly; this.strategies=strategies; this.mutations=mutations;
    }
    @GetMapping("/debts") public List<DebtResponse> debts() { return debts.findAll(); }
    @GetMapping("/debts/{id}") public DebtResponse debt(@PathVariable UUID id) { return debts.findById(id); }
    @GetMapping("/payments") public List<PaymentResponse> payments(@RequestParam(required=false) UUID debtId) { return payments.findAll(debtId); }
    @GetMapping("/financial-profile") public FinancialProfileResponse profile() { return profiles.get(); }
    @GetMapping("/dashboard/summary") public DashboardSummaryResponse summary() { return dashboard.getSummary(); }
    @GetMapping("/due-dates/upcoming") public List<UpcomingDueResponse> upcoming() { return dues.getUpcomingDues(); }
    @GetMapping("/strategies/comparison") public StrategyResponse.StrategyComparisonDto comparison() { return strategies.getComparison(); }
    @GetMapping("/strategies/active") public StrategyResponse activeStrategy() { return strategies.getActiveStrategy(); }
    /** Identifies the credential owner; channel identity must be bound before querying finances. */
    @GetMapping("/identity") public Map<String, Object> identity(org.springframework.security.core.Authentication authentication) {
        return Map.of("userId", authentication.getName(), "allowWrites",
            authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("AUTOMATION_WRITE")));
    }
    @GetMapping("/monthly-progress") public MonthlyProgressResponse monthly(@RequestParam int year, @RequestParam int month) { return monthly.get(year, month); }

    @PostMapping("/debts") @ResponseStatus(HttpStatus.CREATED)
    public JsonNode createDebt(@RequestHeader("Idempotency-Key") UUID key, @Valid @RequestBody DebtRequest body) {
        return mutations.execute(key, "POST /debts", body, () -> debts.create(body));
    }
    @PutMapping("/debts/{id}")
    public JsonNode updateDebt(@PathVariable UUID id, @RequestHeader("Idempotency-Key") UUID key, @Valid @RequestBody DebtRequest body) {
        return mutations.execute(key, "PUT /debts/"+id, body, () -> debts.update(id, body));
    }
    @DeleteMapping("/debts/{id}")
    public JsonNode deleteDebt(@PathVariable UUID id, @RequestHeader("Idempotency-Key") UUID key) {
        return mutations.execute(key, "DELETE /debts/"+id, null, () -> { debts.delete(id); return Map.of("deleted", true); });
    }
    @PostMapping("/payments") @ResponseStatus(HttpStatus.CREATED)
    public JsonNode createPayment(@RequestHeader("Idempotency-Key") UUID key, @Valid @RequestBody PaymentRequest body) {
        return mutations.execute(key, "POST /payments", body, () -> payments.create(body));
    }
    @PutMapping("/payments/{id}")
    public JsonNode updatePayment(@PathVariable UUID id, @RequestHeader("Idempotency-Key") UUID key, @Valid @RequestBody PaymentRequest body) {
        return mutations.execute(key, "PUT /payments/"+id, body, () -> payments.update(id, body));
    }
    @DeleteMapping("/payments/{id}")
    public JsonNode deletePayment(@PathVariable UUID id, @RequestHeader("Idempotency-Key") UUID key) {
        return mutations.execute(key, "DELETE /payments/"+id, null, () -> payments.delete(id));
    }
    @PutMapping("/financial-profile")
    public JsonNode updateProfile(@RequestHeader("Idempotency-Key") UUID key, @Valid @RequestBody FinancialProfileRequest body) {
        return mutations.execute(key, "PUT /financial-profile", body, () -> profiles.update(body));
    }
}
