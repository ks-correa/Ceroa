package com.ceroa.service;

import com.ceroa.api.dto.StrategyResponse;
import com.ceroa.api.dto.StrategyResponse.*;
import com.ceroa.domain.Debt;
import com.ceroa.domain.StrategyType;
import com.ceroa.domain.UserPlan;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Component
public class StrategyEngine {

    public static final int CERO_DEBT_LIMIT = 2;
    public static final int MAX_MONTHS = 600;
    private static final DateTimeFormatter PAYOFF_FORMATTER = DateTimeFormatter.ofPattern("MMM 'de' yyyy", Locale.forLanguageTag("es-CO"));

    private final RateNormalizationService rateService;
    private final DebtPaymentResolver paymentResolver;

    public StrategyEngine(RateNormalizationService rateService, DebtPaymentResolver paymentResolver) {
        this.rateService = rateService;
        this.paymentResolver = paymentResolver;
    }

    public StrategyResponse execute(
            List<Debt> allDebts,
            StrategyType requestedStrategy,
            UserPlan plan,
            BigDecimal configuredBudget) {

        StrategyType strategy = requestedStrategy != null ? requestedStrategy : StrategyType.SNOWBALL;
        UserPlan effectivePlan = plan != null ? plan : UserPlan.CERO;

        List<Debt> activeDebts = allDebts.stream()
                .filter(d -> d.getCurrentBalance() != null && d.getCurrentBalance().compareTo(BigDecimal.ZERO) > 0)
                .toList();

        if (activeDebts.isEmpty()) {
            return new StrategyResponse(
                    effectivePlan,
                    strategy,
                    "EMPTY",
                    "No hay deudas registradas con saldo pendiente.",
                    false,
                    0,
                    0,
                    List.of(),
                    null,
                    null,
                    null,
                    null
            );
        }

        // Determinar deudas consideradas según el plan
        List<Debt> consideredDebts;
        if (effectivePlan == UserPlan.CERO) {
            consideredDebts = activeDebts.stream().limit(CERO_DEBT_LIMIT).toList();
        } else {
            consideredDebts = activeDebts;
        }

        // Ordenamiento y normalización
        OrderResult orderResult = orderDebts(consideredDebts, strategy);
        List<EvaluatedDebt> orderedEvaluated = orderResult.evaluatedDebts();
        boolean hasNonComparable = orderResult.hasNonComparable();

        // Distribución de presupuesto mensual
        distributePayments(orderedEvaluated, configuredBudget);

        // Proyección de amortización si los datos son suficientes
        SimulationResult simResult = runSimulation(orderedEvaluated, configuredBudget, strategy);

        // Armar DTOs de deuda
        List<StrategyDebtDto> debtDtos = new ArrayList<>();
        for (EvaluatedDebt ed : orderedEvaluated) {
            Debt d = ed.debt;
            RateNormalizationService.NormalizedRate nr = ed.normalizedRate;

            BigDecimal projectedInterest = null;
            BigDecimal projectedPrincipal = null;
            String estimatedPayoffDate = null;
            Integer estimatedMonths = null;
            boolean projAvailable = false;

            if (effectivePlan == UserPlan.PLUS && simResult.available) {
                DebtProjection dp = simResult.debtProjections.get(d.getId());
                if (dp != null) {
                    projectedInterest = dp.interest;
                    projectedPrincipal = dp.principal;
                    estimatedPayoffDate = dp.payoffDate;
                    estimatedMonths = dp.months;
                    projAvailable = true;
                }
            }

            BigDecimal extraPayment = effectivePlan == UserPlan.PLUS ? ed.extraPayment : null;
            // Para Cero, la orientación de siguiente pago es la recomendada o exigible
            BigDecimal recommendedPayment = ed.recommendedPayment != null ? ed.recommendedPayment : ed.basePayment;

            debtDtos.add(new StrategyDebtDto(
                    d.getId(),
                    d.getName(),
                    d.getEntity(),
                    d.getType(),
                    d.getCategoryLabel(),
                    d.getCurrentBalance(),
                    d.getOriginalAmount(),
                    d.getInterestRate(),
                    d.getRateType(),
                    nr.comparableAnnualRate(),
                    nr.comparable(),
                    nr.reason(),
                    ed.priority,
                    ed.priority != null && ed.priority == 1,
                    ed.basePayment,
                    extraPayment,
                    recommendedPayment,
                    projectedInterest,
                    projectedPrincipal,
                    estimatedPayoffDate,
                    estimatedMonths,
                    projAvailable
            ));
        }

        StrategyDebtDto priorityDebt = debtDtos.stream()
                .filter(StrategyDebtDto::isPriority)
                .findFirst()
                .orElse(null);

        // Proyección resumida (para Cero y Plus)
        StrategyProjectionDto summaryProjection = new StrategyProjectionDto(
                simResult.available,
                simResult.payoffDate,
                simResult.months,
                simResult.totalInterest,
                simResult.totalPrincipal,
                simResult.monthlyBudget,
                true,
                simResult.missingReason
        );

        // Global Projection (Solo Plus)
        StrategyProjectionDto globalProjection = effectivePlan == UserPlan.PLUS ? summaryProjection : null;

        // Comparativa Snowball vs Avalanche (Solo Plus)
        StrategyComparisonDto comparison = null;
        if (effectivePlan == UserPlan.PLUS) {
            comparison = buildComparison(consideredDebts, configuredBudget);
        }

        String status = "SUCCESS";
        String statusReason = null;
        if (strategy == StrategyType.AVALANCHE && hasNonComparable) {
            status = "INSUFFICIENT_DATA";
            statusReason = "Existen obligaciones con tasa indexada o no disponible que impiden determinar con certeza el orden de prioridad global en Avalancha.";
        } else if (!simResult.available && (simResult.missingReason != null)) {
            // Si la proyección no pudo calcularse pero el orden sí
            statusReason = simResult.missingReason;
        }

        return new StrategyResponse(
                effectivePlan,
                strategy,
                status,
                statusReason,
                hasNonComparable,
                consideredDebts.size(),
                activeDebts.size(),
                debtDtos,
                priorityDebt,
                summaryProjection,
                globalProjection,
                comparison
        );
    }

    private OrderResult orderDebts(List<Debt> debts, StrategyType strategy) {
        List<EvaluatedDebt> evaluated = new ArrayList<>();
        boolean hasNonComparable = false;

        for (Debt d : debts) {
            RateNormalizationService.NormalizedRate nr = rateService.normalize(d);
            BigDecimal basePayment = paymentResolver.resolveExigiblePayment(d);
            if (!nr.comparable()) {
                hasNonComparable = true;
            }
            evaluated.add(new EvaluatedDebt(d, nr, basePayment));
        }

        if (strategy == StrategyType.SNOWBALL) {
            // Menor saldo primero. Desempate técnico estable: createdAt asc, luego id asc.
            // NO se usa tasa como desempate de Snowball.
            evaluated.sort(Comparator.comparing((EvaluatedDebt ed) -> ed.debt.getCurrentBalance())
                    .thenComparing(ed -> ed.debt.getCreatedAt(), Comparator.nullsLast(Comparator.naturalOrder()))
                    .thenComparing(ed -> ed.debt.getId()));

            for (int i = 0; i < evaluated.size(); i++) {
                evaluated.get(i).priority = i + 1;
            }
        } else {
            // AVALANCHE:
            // Ordena únicamente tasas comparables. No comparables quedan sin prioridad (priority = null).
            // Desempate técnico estable: createdAt asc, luego id asc.
            // NO se usa saldo como desempate de Avalanche.
            List<EvaluatedDebt> comparables = evaluated.stream()
                    .filter(ed -> ed.normalizedRate.comparable())
                    .sorted(Comparator.comparing((EvaluatedDebt ed) -> ed.normalizedRate.comparableAnnualRate(), Comparator.reverseOrder())
                            .thenComparing(ed -> ed.debt.getCreatedAt(), Comparator.nullsLast(Comparator.naturalOrder()))
                            .thenComparing(ed -> ed.debt.getId()))
                    .toList();

            List<EvaluatedDebt> nonComparables = evaluated.stream()
                    .filter(ed -> !ed.normalizedRate.comparable())
                    .sorted(Comparator.comparing((EvaluatedDebt ed) -> ed.debt.getCreatedAt(), Comparator.nullsLast(Comparator.naturalOrder()))
                            .thenComparing(ed -> ed.debt.getId()))
                    .toList();

            // Solo asignamos prioridad numérica si NO hay deudas no comparables que alteren el orden global
            if (nonComparables.isEmpty()) {
                for (int i = 0; i < comparables.size(); i++) {
                    comparables.get(i).priority = i + 1;
                }
            } else {
                // Hay no comparables: se marca que no se puede fijar la prioridad global
                for (EvaluatedDebt c : comparables) {
                    c.priority = null;
                }
                for (EvaluatedDebt nc : nonComparables) {
                    nc.priority = null;
                }
            }

            evaluated = new ArrayList<>();
            evaluated.addAll(comparables);
            evaluated.addAll(nonComparables);
        }

        return new OrderResult(evaluated, hasNonComparable);
    }

    private void distributePayments(List<EvaluatedDebt> debts, BigDecimal configuredBudget) {
        BigDecimal sumBase = BigDecimal.ZERO;
        for (EvaluatedDebt ed : debts) {
            BigDecimal base = ed.basePayment != null && ed.basePayment.compareTo(BigDecimal.ZERO) > 0
                    ? ed.basePayment.min(ed.debt.getCurrentBalance())
                    : BigDecimal.ZERO;
            sumBase = sumBase.add(base);
        }

        BigDecimal budget = configuredBudget != null && configuredBudget.compareTo(BigDecimal.ZERO) > 0
                ? configuredBudget
                : sumBase;

        BigDecimal remainingExtra = budget.subtract(sumBase).max(BigDecimal.ZERO);

        for (EvaluatedDebt ed : debts) {
            BigDecimal base = ed.basePayment != null && ed.basePayment.compareTo(BigDecimal.ZERO) > 0
                    ? ed.basePayment.min(ed.debt.getCurrentBalance())
                    : BigDecimal.ZERO;
            ed.basePayment = base;

            BigDecimal extra = BigDecimal.ZERO;
            if (ed.priority != null && ed.priority == 1 && remainingExtra.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal debtDeficit = ed.debt.getCurrentBalance().subtract(base).max(BigDecimal.ZERO);
                extra = remainingExtra.min(debtDeficit);
                remainingExtra = remainingExtra.subtract(extra);
            }
            ed.extraPayment = extra;
            ed.recommendedPayment = base.add(extra);
        }
    }

    public SimulationResult runSimulation(List<EvaluatedDebt> evaluatedDebts, BigDecimal configuredBudget, StrategyType strategy) {
        if (evaluatedDebts.isEmpty()) {
            return SimulationResult.empty();
        }

        // Cada deuda debe tener datos suficientes
        for (EvaluatedDebt ed : evaluatedDebts) {
            if (!ed.normalizedRate.comparable()) {
                return SimulationResult.insufficient("Una o más obligaciones tienen tasa indexada o no disponible, impidiendo proyectar la amortización sin inventar datos.");
            }
            if (ed.basePayment == null) {
                return SimulationResult.insufficient("Una o más obligaciones no tienen cuota o pago mínimo definido para la proyección.");
            }
        }

        BigDecimal sumBase = evaluatedDebts.stream()
                .map(ed -> ed.basePayment)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal budget = configuredBudget != null && configuredBudget.compareTo(BigDecimal.ZERO) > 0
                ? configuredBudget
                : sumBase;

        if (budget.compareTo(BigDecimal.ZERO) <= 0) {
            return SimulationResult.insufficient("El presupuesto disponible para deudas no puede ser cero.");
        }

        // Verificar que el presupuesto cubra al menos los intereses del primer mes
        BigDecimal month1Interest = BigDecimal.ZERO;
        for (EvaluatedDebt ed : evaluatedDebts) {
            BigDecimal bal = ed.debt.getCurrentBalance();
            BigDecimal intMonth = bal.multiply(ed.normalizedRate.monthlyFractionalRate()).setScale(2, RoundingMode.HALF_UP);
            month1Interest = month1Interest.add(intMonth);
        }
        if (month1Interest.compareTo(budget) >= 0 && month1Interest.compareTo(BigDecimal.ZERO) > 0) {
            return SimulationResult.insufficient("El presupuesto mensual no cubre los intereses generados. Se requiere revisar la capacidad de pago.");
        }

        // Estado mutable para la simulación
        List<SimDebt> simDebts = evaluatedDebts.stream().map(SimDebt::new).toList();
        BigDecimal totalInterest = BigDecimal.ZERO;
        BigDecimal totalPrincipal = simDebts.stream().map(sd -> sd.initialBalance).reduce(BigDecimal.ZERO, BigDecimal::add);
        Map<UUID, DebtProjection> debtProjections = new HashMap<>();

        int month = 0;
        LocalDate today = LocalDate.now();

        while (simDebts.stream().anyMatch(SimDebt::isActive) && month < MAX_MONTHS) {
            month++;

            // 1. Acumular interés mensual
            for (SimDebt sd : simDebts) {
                if (!sd.isActive()) continue;
                BigDecimal interest = sd.balance.multiply(sd.monthlyRate).setScale(2, RoundingMode.HALF_UP);
                sd.balance = sd.balance.add(interest);
                sd.accumulatedInterest = sd.accumulatedInterest.add(interest);
                totalInterest = totalInterest.add(interest);
            }

            BigDecimal remBudget = budget;

            // 2. Pagar cuotas base
            for (SimDebt sd : simDebts) {
                if (!sd.isActive()) continue;
                BigDecimal payment = sd.basePayment.min(sd.balance).min(remBudget);
                sd.balance = sd.balance.subtract(payment);
                remBudget = remBudget.subtract(payment);

                if (!sd.isActive() && !debtProjections.containsKey(sd.debtId)) {
                    debtProjections.put(sd.debtId, new DebtProjection(
                            sd.accumulatedInterest,
                            sd.initialBalance,
                            formatPayoffDate(today.plusMonths(month)),
                            month
                    ));
                }
            }

            // 3. Pagar excedente por prioridad
            List<SimDebt> priorityList = new ArrayList<>(simDebts);
            priorityList.sort(strategy == StrategyType.SNOWBALL
                    ? Comparator.comparing((SimDebt sd) -> sd.balance)
                            .thenComparing(sd -> sd.createdAt, Comparator.nullsLast(Comparator.naturalOrder()))
                            .thenComparing(sd -> sd.debtId)
                    : Comparator.comparing((SimDebt sd) -> sd.comparableAnnualRate, Comparator.reverseOrder())
                            .thenComparing(sd -> sd.createdAt, Comparator.nullsLast(Comparator.naturalOrder()))
                            .thenComparing(sd -> sd.debtId));

            for (SimDebt sd : priorityList) {
                if (!sd.isActive() || remBudget.compareTo(BigDecimal.ZERO) <= 0) continue;
                BigDecimal payment = sd.balance.min(remBudget);
                sd.balance = sd.balance.subtract(payment);
                remBudget = remBudget.subtract(payment);

                if (!sd.isActive() && !debtProjections.containsKey(sd.debtId)) {
                    debtProjections.put(sd.debtId, new DebtProjection(
                            sd.accumulatedInterest,
                            sd.initialBalance,
                            formatPayoffDate(today.plusMonths(month)),
                            month
                    ));
                }
            }
        }

        if (month >= MAX_MONTHS && simDebts.stream().anyMatch(SimDebt::isActive)) {
            return SimulationResult.insufficient("La proyección excede el plazo máximo de 50 años.");
        }

        // Asegurar que todas las deudas registradas tengan proyección si se liquidaron
        for (SimDebt sd : simDebts) {
            if (!debtProjections.containsKey(sd.debtId)) {
                debtProjections.put(sd.debtId, new DebtProjection(
                        sd.accumulatedInterest,
                        sd.initialBalance,
                        formatPayoffDate(today.plusMonths(month)),
                        month
                ));
            }
        }

        String globalPayoffDate = month == 0 ? "Al día" : formatPayoffDate(today.plusMonths(month));

        return new SimulationResult(
                true,
                globalPayoffDate,
                month,
                totalInterest.setScale(0, RoundingMode.HALF_UP),
                totalPrincipal.setScale(0, RoundingMode.HALF_UP),
                budget,
                debtProjections,
                null
        );
    }

    private StrategyComparisonDto buildComparison(List<Debt> debts, BigDecimal configuredBudget) {
        OrderResult snowballOrder = orderDebts(debts, StrategyType.SNOWBALL);
        OrderResult avalancheOrder = orderDebts(debts, StrategyType.AVALANCHE);

        SimulationResult snowballSim = runSimulation(snowballOrder.evaluatedDebts(), configuredBudget, StrategyType.SNOWBALL);
        SimulationResult avalancheSim = runSimulation(avalancheOrder.evaluatedDebts(), configuredBudget, StrategyType.AVALANCHE);

        if (!snowballSim.available || !avalancheSim.available) {
            String reason = !avalancheSim.available ? avalancheSim.missingReason : snowballSim.missingReason;
            return new StrategyComparisonDto(false, null, null, null, null, reason);
        }

        StrategyStatsDto snowballStats = new StrategyStatsDto(
                snowballSim.totalInterest,
                snowballSim.payoffDate,
                snowballSim.months,
                snowballOrder.evaluatedDebts().stream().map(ed -> ed.debt.getId()).toList()
        );

        StrategyStatsDto avalancheStats = new StrategyStatsDto(
                avalancheSim.totalInterest,
                avalancheSim.payoffDate,
                avalancheSim.months,
                avalancheOrder.evaluatedDebts().stream().map(ed -> ed.debt.getId()).toList()
        );

        BigDecimal interestDiff = snowballSim.totalInterest.subtract(avalancheSim.totalInterest);
        Integer monthsDiff = snowballSim.months - avalancheSim.months;

        return new StrategyComparisonDto(
                true,
                snowballStats,
                avalancheStats,
                interestDiff,
                monthsDiff,
                null
        );
    }

    private String formatPayoffDate(LocalDate date) {
        String formatted = date.format(PAYOFF_FORMATTER);
        if (formatted != null && !formatted.isEmpty()) {
            return Character.toUpperCase(formatted.charAt(0)) + formatted.substring(1);
        }
        return formatted;
    }

    private record OrderResult(List<EvaluatedDebt> evaluatedDebts, boolean hasNonComparable) {}

    public static class EvaluatedDebt {
        public final Debt debt;
        public final RateNormalizationService.NormalizedRate normalizedRate;
        public BigDecimal basePayment;
        public BigDecimal extraPayment;
        public BigDecimal recommendedPayment;
        public Integer priority;

        public EvaluatedDebt(Debt debt, RateNormalizationService.NormalizedRate normalizedRate, BigDecimal basePayment) {
            this.debt = debt;
            this.normalizedRate = normalizedRate;
            this.basePayment = basePayment;
            this.extraPayment = BigDecimal.ZERO;
            this.recommendedPayment = basePayment;
            this.priority = null;
        }
    }

    private static class SimDebt {
        final UUID debtId;
        final BigDecimal initialBalance;
        BigDecimal balance;
        final BigDecimal monthlyRate;
        final BigDecimal comparableAnnualRate;
        final BigDecimal basePayment;
        final java.time.OffsetDateTime createdAt;
        BigDecimal accumulatedInterest;

        SimDebt(EvaluatedDebt ed) {
            this.debtId = ed.debt.getId();
            this.initialBalance = ed.debt.getCurrentBalance();
            this.balance = ed.debt.getCurrentBalance();
            this.monthlyRate = ed.normalizedRate.monthlyFractionalRate();
            this.comparableAnnualRate = ed.normalizedRate.comparableAnnualRate();
            this.basePayment = ed.basePayment != null ? ed.basePayment : BigDecimal.ZERO;
            this.createdAt = ed.debt.getCreatedAt();
            this.accumulatedInterest = BigDecimal.ZERO;
        }

        boolean isActive() {
            return balance != null && balance.compareTo(new BigDecimal("0.01")) > 0;
        }
    }

    public record DebtProjection(BigDecimal interest, BigDecimal principal, String payoffDate, int months) {}

    public record SimulationResult(
            boolean available,
            String payoffDate,
            Integer months,
            BigDecimal totalInterest,
            BigDecimal totalPrincipal,
            BigDecimal monthlyBudget,
            Map<UUID, DebtProjection> debtProjections,
            String missingReason
    ) {
        public static SimulationResult empty() {
            return new SimulationResult(false, null, 0, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, Map.of(), "Sin deudas activas.");
        }

        public static SimulationResult insufficient(String reason) {
            return new SimulationResult(false, null, null, null, null, null, Map.of(), reason);
        }
    }
}

