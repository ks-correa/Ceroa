package com.ceroa.service;

import com.ceroa.api.dto.StrategyComparisonResponse;
import com.ceroa.api.dto.StrategyStatsResponse;
import com.ceroa.domain.Debt;
import com.ceroa.domain.FinancialProfile;
import com.ceroa.domain.StrategyType;
import com.ceroa.exception.ResourceNotFoundException;
import com.ceroa.repository.DebtRepository;
import com.ceroa.repository.FinancialProfileRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class StrategyService {
    private static final int MAX_MONTHS = 600;
    private static final BigDecimal DEFAULT_PAYMENT = new BigDecimal("100000");
    private static final DateTimeFormatter PAYOFF_FORMAT = DateTimeFormatter.ofPattern("MMM 'de' yyyy", Locale.forLanguageTag("es-CO"));

    private final DebtRepository debtRepository;
    private final FinancialProfileRepository profileRepository;
    private final CurrentUserService currentUser;

    public StrategyService(
            DebtRepository debtRepository,
            FinancialProfileRepository profileRepository,
            CurrentUserService currentUser) {
        this.debtRepository = debtRepository;
        this.profileRepository = profileRepository;
        this.currentUser = currentUser;
    }

    @Transactional(readOnly = true)
    public StrategyComparisonResponse compare(StrategyType requestedStrategy) {
        List<Debt> debts = debtRepository.findAllByUserIdOrderByCreatedAtDesc(currentUser.id()).stream()
                .filter(debt -> debt.getCurrentBalance().signum() > 0)
                .toList();
        FinancialProfile profile = profileRepository.findByUserId(currentUser.id())
                .orElseThrow(() -> new ResourceNotFoundException("Perfil financiero no encontrado"));

        Projection snowball = project(debts, StrategyType.SNOWBALL);
        Projection avalanche = project(debts, StrategyType.AVALANCHE);
        BigDecimal savings = snowball.interest.subtract(avalanche.interest).max(BigDecimal.ZERO);
        StrategyType effectiveStrategy = requestedStrategy == null ? profile.getActiveStrategy() : requestedStrategy;
        List<UUID> ordered = ordered(debts, effectiveStrategy).stream().map(Debt::getId).toList();

        return new StrategyComparisonResponse(
                effectiveStrategy,
                stats(snowball, BigDecimal.ZERO),
                stats(avalanche, savings),
                ordered);
    }

    private Projection project(List<Debt> source, StrategyType strategy) {
        if (source.isEmpty()) return new Projection(BigDecimal.ZERO, 0);
        List<DebtBalance> debts = source.stream().map(DebtBalance::new).toList();
        BigDecimal budget = source.stream().map(this::monthlyCommitment).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalInterest = BigDecimal.ZERO;
        int month = 0;

        while (debts.stream().anyMatch(DebtBalance::active) && month < MAX_MONTHS) {
            month++;
            for (DebtBalance debt : debts) {
                if (!debt.active()) continue;
                BigDecimal interest = debt.balance.multiply(debt.monthlyRate).setScale(2, RoundingMode.HALF_UP);
                debt.balance = debt.balance.add(interest);
                totalInterest = totalInterest.add(interest);
            }

            BigDecimal remainingBudget = budget;
            for (DebtBalance debt : debts) {
                if (!debt.active()) continue;
                BigDecimal payment = debt.minimum.min(debt.balance).min(remainingBudget);
                debt.balance = debt.balance.subtract(payment);
                remainingBudget = remainingBudget.subtract(payment);
            }

            List<DebtBalance> priority = new ArrayList<>(debts);
            priority.sort(balanceComparator(strategy));
            for (DebtBalance debt : priority) {
                if (!debt.active() || remainingBudget.signum() <= 0) continue;
                BigDecimal payment = debt.balance.min(remainingBudget);
                debt.balance = debt.balance.subtract(payment);
                remainingBudget = remainingBudget.subtract(payment);
            }

            if (budget.signum() == 0) break;
        }
        return new Projection(totalInterest.setScale(0, RoundingMode.HALF_UP), month);
    }

    private List<Debt> ordered(List<Debt> debts, StrategyType strategy) {
        Comparator<Debt> comparator = strategy == StrategyType.SNOWBALL
                ? Comparator.comparing(Debt::getCurrentBalance)
                : Comparator.comparing(Debt::getInterestRate, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(Debt::getCurrentBalance);
        return debts.stream().sorted(comparator).toList();
    }

    private Comparator<DebtBalance> balanceComparator(StrategyType strategy) {
        return strategy == StrategyType.SNOWBALL
                ? Comparator.comparing(item -> item.balance)
                : Comparator.comparing((DebtBalance item) -> item.annualRate).reversed()
                        .thenComparing(item -> item.balance);
    }

    private BigDecimal monthlyCommitment(Debt debt) {
        if (debt.getMonthlyPayment() != null && debt.getMonthlyPayment().signum() > 0) return debt.getMonthlyPayment();
        if (debt.getMinimumPayment() != null && debt.getMinimumPayment().signum() > 0) return debt.getMinimumPayment();
        return DEFAULT_PAYMENT;
    }

    private StrategyStatsResponse stats(Projection projection, BigDecimal savings) {
        String payoff = projection.months == 0 ? "Al día"
                : projection.months >= MAX_MONTHS ? "Revisar capacidad"
                : LocalDate.now().plusMonths(projection.months).format(PAYOFF_FORMAT);
        return new StrategyStatsResponse(projection.interest, payoff, projection.months, savings);
    }

    private static final class DebtBalance {
        private BigDecimal balance;
        private final BigDecimal annualRate;
        private final BigDecimal monthlyRate;
        private final BigDecimal minimum;

        private DebtBalance(Debt debt) {
            balance = debt.getCurrentBalance();
            annualRate = debt.getInterestRate() == null ? BigDecimal.ZERO : debt.getInterestRate();
            monthlyRate = annualRate.divide(new BigDecimal("1200"), 12, RoundingMode.HALF_UP);
            minimum = debt.getMinimumPayment() == null ? BigDecimal.ZERO : debt.getMinimumPayment();
        }

        private boolean active() { return balance.compareTo(new BigDecimal("0.01")) > 0; }
    }

    private record Projection(BigDecimal interest, int months) {}
}
