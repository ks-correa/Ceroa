package com.ceroa.service;

import com.ceroa.api.dto.SimulationEventRequest;
import com.ceroa.api.dto.SimulationResponse;
import com.ceroa.api.dto.SimulationResponse.*;
import com.ceroa.domain.Debt;
import com.ceroa.domain.StrategyType;
import com.ceroa.exception.BusinessRuleException;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Component
public class SimulationEngine {

    public static final int MAX_SIMULATION_MONTHS = 600;
    private static final DateTimeFormatter PAYOFF_FORMATTER = DateTimeFormatter.ofPattern("MMM 'de' yyyy", Locale.forLanguageTag("es-CO"));
    private static final DateTimeFormatter PERIOD_FORMATTER = DateTimeFormatter.ofPattern("MMM yyyy", Locale.forLanguageTag("es-CO"));

    private final RateNormalizationService rateService;
    private final DebtPaymentResolver paymentResolver;

    public SimulationEngine(RateNormalizationService rateService, DebtPaymentResolver paymentResolver) {
        this.rateService = rateService;
        this.paymentResolver = paymentResolver;
    }

    public SimulationResponse simulate(
            Debt debt,
            StrategyType strategy,
            List<SimulationEventRequest> rawEvents,
            LocalDate referenceDateOverride
    ) {
        LocalDate referenceDate = referenceDateOverride != null ? referenceDateOverride : LocalDate.now();

        SimulationDebtSummaryDto debtSummary = new SimulationDebtSummaryDto(
                debt.getId(),
                debt.getName(),
                debt.getEntity(),
                debt.getCurrentBalance(),
                debt.getInterestRate(),
                debt.getRateType(),
                debt.getCategoryLabel()
        );

        List<String> assumptions = buildAssumptions(debt, strategy);

        // 1. Validar datos suficientes de la obligación
        RateNormalizationService.NormalizedRate nr = rateService.normalize(debt);
        if (!nr.comparable()) {
            return SimulationResponse.insufficientData(
                    debtSummary,
                    strategy,
                    assumptions,
                    nr.reason() != null ? nr.reason() : "La obligación tiene tasa indexada o no comparable, impidiendo calcular la simulación sin inventar datos."
            );
        }

        BigDecimal basePayment = paymentResolver.resolveExigiblePayment(debt);
        if (basePayment == null || basePayment.compareTo(BigDecimal.ZERO) <= 0) {
            return SimulationResponse.insufficientData(
                    debtSummary,
                    strategy,
                    assumptions,
                    "La obligación no tiene una cuota mensual ni pago mínimo exigible definido para la simulación."
            );
        }

        if (debt.getCurrentBalance() == null || debt.getCurrentBalance().compareTo(BigDecimal.ZERO) <= 0) {
            return SimulationResponse.insufficientData(
                    debtSummary,
                    strategy,
                    assumptions,
                    "La obligación no presenta saldo pendiente para simular."
            );
        }

        BigDecimal monthlyFraction = nr.monthlyFractionalRate();
        BigDecimal month1Interest = debt.getCurrentBalance().multiply(monthlyFraction).setScale(2, RoundingMode.HALF_UP);
        if (month1Interest.compareTo(basePayment) >= 0 && month1Interest.compareTo(BigDecimal.ZERO) > 0) {
            return SimulationResponse.insufficientData(
                    debtSummary,
                    strategy,
                    assumptions,
                    "La cuota base registrada (" + basePayment + ") no cubre los intereses del primer periodo (" + month1Interest + "). Se requiere una capacidad de pago superior a los intereses para amortizar capital."
            );
        }

        // 2. Normalizar y validar eventos hipotéticos
        List<NormalizedEvent> normalizedEvents = normalizeEvents(rawEvents, referenceDate);

        // 3. Proyectar línea base (mismas condiciones registradas, sin eventos hipotéticos)
        ProjectionRun baselineRun = runProjection(
                debt.getCurrentBalance(),
                basePayment,
                monthlyFraction,
                List.of(),
                referenceDate,
                false
        );

        if (!baselineRun.success()) {
            return SimulationResponse.insufficientData(debtSummary, strategy, assumptions, baselineRun.failureReason());
        }

        // 4. Proyectar escenario simulado (mismas condiciones base + eventos hipotéticos)
        ProjectionRun simulatedRun = runProjection(
                debt.getCurrentBalance(),
                basePayment,
                monthlyFraction,
                normalizedEvents,
                referenceDate,
                true
        );

        if (!simulatedRun.success()) {
            return SimulationResponse.insufficientData(debtSummary, strategy, assumptions, simulatedRun.failureReason());
        }

        // 5. Comparar y calcular diferencias estimadas (nunca inventar datos)
        int monthsReduced = Math.max(0, baselineRun.months() - simulatedRun.months());
        BigDecimal interestSavings = baselineRun.totalInterest().subtract(simulatedRun.totalInterest()).max(BigDecimal.ZERO);

        SimulationProjectionDto baselineDto = new SimulationProjectionDto(
                baselineRun.totalInterest(),
                debt.getCurrentBalance().setScale(0, RoundingMode.HALF_UP),
                baselineRun.months(),
                formatPayoffDate(referenceDate.plusMonths(baselineRun.months()))
        );

        SimulationProjectionDto simulatedDto = new SimulationProjectionDto(
                simulatedRun.totalInterest(),
                debt.getCurrentBalance().setScale(0, RoundingMode.HALF_UP),
                simulatedRun.months(),
                formatPayoffDate(referenceDate.plusMonths(simulatedRun.months()))
        );

        SimulationDifferencesDto differencesDto = new SimulationDifferencesDto(monthsReduced, interestSavings);

        return new SimulationResponse(
                "SUCCESS",
                null,
                debtSummary,
                strategy,
                assumptions,
                baselineDto,
                simulatedDto,
                differencesDto,
                simulatedRun.periods()
        );
    }

    private List<NormalizedEvent> normalizeEvents(List<SimulationEventRequest> events, LocalDate referenceDate) {
        if (events == null || events.isEmpty()) {
            return List.of();
        }

        List<NormalizedEvent> list = new ArrayList<>();
        YearMonth currentYm = YearMonth.from(referenceDate);

        for (SimulationEventRequest req : events) {
            if (req == null) continue;

            if (req.date() == null && req.period() == null) {
                throw new BusinessRuleException("INVALID_SIMULATION_EVENT", "Cada evento hipotético debe incluir una fecha o un número de periodo.");
            }

            int targetPeriod;
            LocalDate effectiveDate = req.date();

            if (req.date() != null) {
                if (req.date().isBefore(referenceDate)) {
                    throw new BusinessRuleException("INVALID_SIMULATION_EVENT", "La fecha del evento (" + req.date() + ") no puede ser anterior a la fecha actual de referencia.");
                }
                YearMonth eventYm = YearMonth.from(req.date());
                int calculatedPeriod = (int) ChronoUnit.MONTHS.between(currentYm, eventYm) + 1;

                if (req.period() != null) {
                    if (req.period() < 1) {
                        throw new BusinessRuleException("INVALID_SIMULATION_EVENT", "El número de periodo debe ser mayor o igual a 1.");
                    }
                    if (!req.period().equals(calculatedPeriod)) {
                        throw new BusinessRuleException(
                                "INVALID_SIMULATION_EVENT",
                                "La fecha (" + req.date() + ") y el periodo (" + req.period() + ") no son coherentes entre sí. La fecha corresponde al periodo " + calculatedPeriod + "."
                        );
                    }
                }
                targetPeriod = calculatedPeriod;
            } else {
                if (req.period() < 1) {
                    throw new BusinessRuleException("INVALID_SIMULATION_EVENT", "El número de periodo debe ser mayor o igual a 1.");
                }
                targetPeriod = req.period();
                effectiveDate = referenceDate.plusMonths(targetPeriod);
            }

            if (req.extraPayment() == null && req.modifiedMonthlyPayment() == null) {
                throw new BusinessRuleException("INVALID_SIMULATION_EVENT", "El evento debe incluir un abono adicional o una modificación de cuota mensual.");
            }

            if (req.extraPayment() != null && req.extraPayment().compareTo(BigDecimal.ZERO) <= 0) {
                throw new BusinessRuleException("INVALID_SIMULATION_EVENT", "El abono adicional debe ser estrictamente mayor que cero.");
            }

            if (req.modifiedMonthlyPayment() != null && req.modifiedMonthlyPayment().compareTo(BigDecimal.ZERO) <= 0) {
                throw new BusinessRuleException("INVALID_SIMULATION_EVENT", "La modificación de cuota mensual debe ser estrictamente mayor que cero.");
            }

            list.add(new NormalizedEvent(
                    targetPeriod,
                    effectiveDate,
                    req.extraPayment(),
                    req.modifiedMonthlyPayment()
            ));
        }

        list.sort(Comparator.comparingInt(NormalizedEvent::period));
        return list;
    }

    private ProjectionRun runProjection(
            BigDecimal initialBalance,
            BigDecimal initialMonthlyPayment,
            BigDecimal monthlyFraction,
            List<NormalizedEvent> events,
            LocalDate referenceDate,
            boolean capturePeriods
    ) {
        BigDecimal balance = initialBalance;
        BigDecimal currentMonthlyPayment = initialMonthlyPayment;
        BigDecimal totalInterest = BigDecimal.ZERO;
        int month = 0;

        List<SimulationPeriodDto> periods = capturePeriods ? new ArrayList<>() : List.of();

        // Mapear eventos por periodo
        Map<Integer, BigDecimal> extraPaymentsByPeriod = new HashMap<>();
        Map<Integer, BigDecimal> modifiedPaymentsByPeriod = new HashMap<>();

        for (NormalizedEvent ev : events) {
            if (ev.extraPayment() != null) {
                extraPaymentsByPeriod.merge(ev.period(), ev.extraPayment(), BigDecimal::add);
            }
            if (ev.modifiedMonthlyPayment() != null) {
                // Si hay varias modificaciones en el mismo periodo, prevalece la última especificada
                modifiedPaymentsByPeriod.put(ev.period(), ev.modifiedMonthlyPayment());
            }
        }

        while (balance.compareTo(new BigDecimal("0.01")) > 0 && month < MAX_SIMULATION_MONTHS) {
            month++;

            // Aplicar modificación de cuota mensual si existe en este periodo (semántica: a partir de este periodo en adelante)
            if (modifiedPaymentsByPeriod.containsKey(month)) {
                currentMonthlyPayment = modifiedPaymentsByPeriod.get(month);
            }

            BigDecimal openingBalance = balance;
            BigDecimal interest = openingBalance.multiply(monthlyFraction).setScale(2, RoundingMode.HALF_UP);
            BigDecimal debtDueWithInterest = openingBalance.add(interest);

            // Pago ordinario del periodo
            BigDecimal normalPayment = currentMonthlyPayment.min(debtDueWithInterest);

            // Abono adicional hipotético del periodo (si existe)
            BigDecimal scheduledExtra = extraPaymentsByPeriod.getOrDefault(month, BigDecimal.ZERO);
            BigDecimal remainingDebt = debtDueWithInterest.subtract(normalPayment).max(BigDecimal.ZERO);
            BigDecimal extraPayment = scheduledExtra.min(remainingDebt);

            BigDecimal totalPaidThisMonth = normalPayment.add(extraPayment);

            if (totalPaidThisMonth.compareTo(interest) <= 0 && openingBalance.compareTo(BigDecimal.ZERO) > 0) {
                return ProjectionRun.failure("El pago proyectado para el periodo " + month + " (" + totalPaidThisMonth + ") no cubre los intereses (" + interest + ").");
            }

            BigDecimal principal = totalPaidThisMonth.subtract(interest).min(openingBalance);
            BigDecimal closingBalance = openingBalance.subtract(principal).max(BigDecimal.ZERO);

            totalInterest = totalInterest.add(interest);
            balance = closingBalance;

            if (capturePeriods) {
                LocalDate periodDate = referenceDate.plusMonths(month);
                String formattedPeriodDate = formatPeriodDate(periodDate);
                periods.add(new SimulationPeriodDto(
                        month,
                        formattedPeriodDate,
                        openingBalance.setScale(2, RoundingMode.HALF_UP),
                        normalPayment.setScale(2, RoundingMode.HALF_UP),
                        extraPayment.setScale(2, RoundingMode.HALF_UP),
                        interest.setScale(2, RoundingMode.HALF_UP),
                        principal.setScale(2, RoundingMode.HALF_UP),
                        closingBalance.setScale(2, RoundingMode.HALF_UP)
                ));
            }
        }

        if (month >= MAX_SIMULATION_MONTHS && balance.compareTo(new BigDecimal("0.01")) > 0) {
            return ProjectionRun.failure("La proyección supera el plazo máximo de 50 años (600 periodos).");
        }

        return ProjectionRun.success(month, totalInterest.setScale(0, RoundingMode.HALF_UP), periods);
    }

    private List<String> buildAssumptions(Debt debt, StrategyType strategy) {
        List<String> list = new ArrayList<>();
        RateNormalizationService.NormalizedRate nr = rateService.normalize(debt);

        if (nr.comparable()) {
            list.add("Tasa estimada proyectada según las condiciones registradas de la obligación (" + nr.comparableAnnualRate() + "% EA).");
        }
        list.add("La simulación asume pagos ordinarios puntuales al cierre de cada periodo mensual.");
        list.add("Semántica de cuota: cuando se modifica el pago mensual, la nueva cuota rige a partir de ese periodo en adelante.");
        list.add("Los abonos adicionales hipotéticos se imputan íntegramente a capital en el periodo correspondiente.");
        list.add("La estrategia de simulación (" + (strategy == StrategyType.SNOWBALL ? "Bola de Nieve" : "Avalancha") + ") es un supuesto hipotético y no modifica tu estrategia activa.");
        list.add("Todos los plazos, fechas y ahorros son estimaciones de simulación; no constituyen una promesa ni modificación contractual real.");
        return list;
    }

    private String formatPayoffDate(LocalDate date) {
        String formatted = date.format(PAYOFF_FORMATTER);
        if (formatted != null && !formatted.isEmpty()) {
            return Character.toUpperCase(formatted.charAt(0)) + formatted.substring(1);
        }
        return formatted;
    }

    private String formatPeriodDate(LocalDate date) {
        String formatted = date.format(PERIOD_FORMATTER);
        if (formatted != null && !formatted.isEmpty()) {
            return Character.toUpperCase(formatted.charAt(0)) + formatted.substring(1);
        }
        return formatted;
    }

    private record NormalizedEvent(
            int period,
            LocalDate date,
            BigDecimal extraPayment,
            BigDecimal modifiedMonthlyPayment
    ) {}

    private record ProjectionRun(
            boolean success,
            int months,
            BigDecimal totalInterest,
            List<SimulationPeriodDto> periods,
            String failureReason
    ) {
        static ProjectionRun success(int months, BigDecimal totalInterest, List<SimulationPeriodDto> periods) {
            return new ProjectionRun(true, months, totalInterest, periods, null);
        }

        static ProjectionRun failure(String reason) {
            return new ProjectionRun(false, 0, BigDecimal.ZERO, List.of(), reason);
        }
    }
}

