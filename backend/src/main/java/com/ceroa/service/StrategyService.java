package com.ceroa.service;

import com.ceroa.api.dto.StrategyComparisonResponse;
import com.ceroa.api.dto.StrategyResponse;
import com.ceroa.api.dto.StrategyResponse.StrategyComparisonDto;
import com.ceroa.api.dto.StrategyResponse.StrategyUpdateRequest;
import com.ceroa.api.dto.StrategyStatsResponse;
import com.ceroa.domain.Debt;
import com.ceroa.domain.FinancialProfile;
import com.ceroa.domain.StrategyType;
import com.ceroa.domain.User;
import com.ceroa.domain.UserPlan;
import com.ceroa.exception.BusinessRuleException;
import com.ceroa.repository.DebtRepository;
import com.ceroa.repository.FinancialProfileRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
public class StrategyService {
    @org.springframework.beans.factory.annotation.Autowired(required = false) private SentinelVersionService sentinelVersions;
    @org.springframework.beans.factory.annotation.Autowired(required = false) private PlanAccessService planAccess;

    private final DebtRepository debtRepository;
    private final FinancialProfileRepository profileRepository;
    private final CurrentUserService currentUser;
    private final StrategyEngine strategyEngine;

    public StrategyService(
            DebtRepository debtRepository,
            FinancialProfileRepository profileRepository,
            CurrentUserService currentUser,
            StrategyEngine strategyEngine) {
        this.debtRepository = debtRepository;
        this.profileRepository = profileRepository;
        this.currentUser = currentUser;
        this.strategyEngine = strategyEngine;
    }

    @Transactional(readOnly = true)
    public StrategyResponse getActiveStrategy() {
        User user = currentUser.entity();
        UserPlan plan = planAccess == null ? PlanAccessService.plan(user) : planAccess.effectivePlan(user);
        FinancialProfile profile = profileRepository.findByUserId(user.getId()).orElse(null);

        StrategyType activeStrategy = profile != null && profile.getActiveStrategy() != null
                ? profile.getActiveStrategy()
                : StrategyType.SNOWBALL;

        BigDecimal budget = profile != null && profile.getAvailableForDebts() != null
                ? profile.getAvailableForDebts()
                : BigDecimal.ZERO;

        List<Debt> allDebts = debtRepository.findAllByUserIdOrderByCreatedAtDesc(user.getId());

        return strategyEngine.execute(allDebts, activeStrategy, plan, budget, profile != null ? profile.getPriorityDebtId() : null);
    }

    @Transactional
    public StrategyResponse updateActiveStrategy(StrategyType newStrategy) {
        currentUser.entityForUpdate();
        if (newStrategy == null) {
            throw new BusinessRuleException("INVALID_STRATEGY", "Debe seleccionar una estrategia de pago válida (Bola de Nieve o Avalancha).");
        }

        UUID userId = currentUser.id();
        long registeredDebts = debtRepository.countByUserId(userId);
        if (registeredDebts < 1) {
            throw new BusinessRuleException("NO_DEBTS_REGISTERED", "Debe tener al menos una deuda registrada para cambiar o aplicar una estrategia.");
        }

        FinancialProfile profile = profileRepository.findByUserId(userId)
                .orElseGet(() -> {
                    FinancialProfile p = new FinancialProfile();
                    p.setUser(currentUser.entity());
                    p.setMonthlyIncome(BigDecimal.ZERO);
                    p.setEssentialExpenses(BigDecimal.ZERO);
                    p.setAvailableForDebts(BigDecimal.ZERO);
                    p.setTotalDeclaredDebts(1);
                    return p;
                });

        profile.setActiveStrategy(newStrategy);
        profileRepository.save(profile);
        if(sentinelVersions!=null)sentinelVersions.mark(userId);

        // Recalcular y devolver representación vigente confirmada
        return getActiveStrategy();
    }

    @Transactional
    public StrategyResponse updatePriority(UUID debtId) {
        currentUser.entityForUpdate();
        UUID userId = currentUser.id();
        if (debtId != null) {
            Debt debt = debtRepository.findAllByUserIdOrderByCreatedAtDesc(userId).stream()
                    .filter(d -> d.getId().equals(debtId)).findFirst()
                    .orElseThrow(() -> new BusinessRuleException("INVALID_PRIORITY_DEBT", "Selecciona una deuda propia con saldo pendiente."));
            if (debt.getCurrentBalance() == null || debt.getCurrentBalance().signum() <= 0) {
                throw new BusinessRuleException("INVALID_PRIORITY_DEBT", "La deuda seleccionada ya no tiene saldo pendiente.");
            }
        }
        FinancialProfile profile = profileRepository.findByUserId(userId).orElse(null);
        if (profile == null) {
            updateActiveStrategy(StrategyType.SNOWBALL);
            profile = profileRepository.findByUserId(userId).orElseThrow();
        }
        profile.setPriorityDebtId(debtId);
        profileRepository.save(profile);
        if(sentinelVersions!=null)sentinelVersions.mark(userId);
        return getActiveStrategy();
    }

    @Transactional(readOnly = true)
    public StrategyComparisonDto getComparison() {
        User user = currentUser.entity();
        if (!(planAccess == null ? PlanAccessService.plusActive(user) : planAccess.entitled(user))) {
            throw new BusinessRuleException("PLAN_RESTRICTED", "La comparación detallada de estrategias requiere el plan Ceroa Plus.");
        }

        StrategyResponse active = getActiveStrategy();
        if (active.comparison() == null) {
            return new StrategyComparisonDto(false, null, null, null, null, "No fue posible generar la comparación.");
        }
        return active.comparison();
    }

    @Transactional(readOnly = true)
    public StrategyComparisonResponse compare(StrategyType requestedStrategy) {
        User user = currentUser.entity();
        FinancialProfile profile = profileRepository.findByUserId(user.getId()).orElse(null);
        BigDecimal budget = profile != null && profile.getAvailableForDebts() != null
                ? profile.getAvailableForDebts()
                : BigDecimal.ZERO;

        List<Debt> allDebts = debtRepository.findAllByUserIdOrderByCreatedAtDesc(user.getId());
        StrategyType effectiveStrategy = requestedStrategy != null ? requestedStrategy
                : (profile != null && profile.getActiveStrategy() != null ? profile.getActiveStrategy() : StrategyType.SNOWBALL);

        // Para DashboardService (EP-08), comparamos Snowball y Avalanche en modo PLUS sobre todas las deudas
        StrategyResponse plusResult = strategyEngine.execute(allDebts, effectiveStrategy, UserPlan.PLUS, budget, requestedStrategy == null && profile != null ? profile.getPriorityDebtId() : null);
        StrategyComparisonDto comp = plusResult.comparison();

        StrategyStatsResponse snowballStats;
        StrategyStatsResponse avalancheStats;
        List<UUID> orderedIds = plusResult.orderedDebts().stream().map(StrategyResponse.StrategyDebtDto::id).toList();

        if (comp != null && comp.available()) {
            snowballStats = new StrategyStatsResponse(
                    comp.snowball().totalInterest(),
                    comp.snowball().payoffDate(),
                    comp.snowball().months(),
                    BigDecimal.ZERO
            );
            BigDecimal savings = comp.interestDifference() != null ? comp.interestDifference().max(BigDecimal.ZERO) : BigDecimal.ZERO;
            avalancheStats = new StrategyStatsResponse(
                    comp.avalanche().totalInterest(),
                    comp.avalanche().payoffDate(),
                    comp.avalanche().months(),
                    savings
            );
        } else {
            // Proyección resumida si comparación completa no está disponible
            StrategyResponse.StrategyProjectionDto sum = plusResult.summaryProjection();
            String payoff = sum != null && sum.available() ? sum.payoffDate() : "Revisar capacidad";
            int months = sum != null && sum.available() && sum.months() != null ? sum.months() : 600;
            BigDecimal interest = sum != null && sum.available() && sum.totalInterest() != null ? sum.totalInterest() : BigDecimal.ZERO;

            snowballStats = new StrategyStatsResponse(interest, payoff, months, BigDecimal.ZERO);
            avalancheStats = new StrategyStatsResponse(interest, payoff, months, BigDecimal.ZERO);
        }

        return new StrategyComparisonResponse(
                effectiveStrategy,
                snowballStats,
                avalancheStats,
                orderedIds
        );
    }
}
