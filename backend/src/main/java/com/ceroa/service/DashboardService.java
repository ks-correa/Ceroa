package com.ceroa.service;

import com.ceroa.api.dto.DashboardNextDueResponse;
import com.ceroa.api.dto.DashboardProgressResponse;
import com.ceroa.api.dto.DashboardSummaryResponse;
import com.ceroa.api.dto.StrategyComparisonResponse;
import com.ceroa.api.dto.StrategyStatsResponse;
import com.ceroa.domain.Debt;
import com.ceroa.domain.DebtStatus;
import com.ceroa.domain.DebtType;
import com.ceroa.domain.FinancialProfile;
import com.ceroa.domain.Payment;
import com.ceroa.domain.StrategyType;
import com.ceroa.repository.DebtRepository;
import com.ceroa.repository.FinancialProfileRepository;
import com.ceroa.repository.PaymentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class DashboardService {

    private final DebtRepository debtRepository;
    private final PaymentRepository paymentRepository;
    private final FinancialProfileRepository profileRepository;
    private final StrategyService strategyService;
    private final CurrentUserService currentUser;

    public DashboardService(
            DebtRepository debtRepository,
            PaymentRepository paymentRepository,
            FinancialProfileRepository profileRepository,
            StrategyService strategyService,
            CurrentUserService currentUser) {
        this.debtRepository = debtRepository;
        this.paymentRepository = paymentRepository;
        this.profileRepository = profileRepository;
        this.strategyService = strategyService;
        this.currentUser = currentUser;
    }

    @Transactional(readOnly = true)
    public DashboardSummaryResponse getSummary() {
        UUID userId = currentUser.id();
        List<Debt> allDebts = debtRepository.findAllByUserIdOrderByCreatedAtDesc(userId);
        List<Payment> allPayments = paymentRepository.findAllByDebtUserIdOrderByDateDescCreatedAtDesc(userId);
        FinancialProfile profile = profileRepository.findByUserId(userId).orElse(null);

        long registeredDebtCount = allDebts.size();
        List<Debt> activeDebts = allDebts.stream()
                .filter(debt -> debt.getStatus() != DebtStatus.PAID
                        && debt.getCurrentBalance() != null
                        && debt.getCurrentBalance().compareTo(BigDecimal.ZERO) > 0)
                .toList();
        int activeDebtCount = activeDebts.size();

        BigDecimal totalRegisteredDebt = activeDebts.stream()
                .map(Debt::getCurrentBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        int totalDeclaredDebts = (profile != null && profile.getTotalDeclaredDebts() != null)
                ? profile.getTotalDeclaredDebts()
                : (int) Math.max(1, registeredDebtCount);

        boolean partialCoverage = totalDeclaredDebts > registeredDebtCount;

        BigDecimal availableForDebt = (profile != null && profile.getAvailableForDebts() != null)
                ? profile.getAvailableForDebts()
                : BigDecimal.ZERO;

        StrategyType activeStrategy = (profile != null && profile.getActiveStrategy() != null)
                ? profile.getActiveStrategy()
                : StrategyType.SNOWBALL;

        // Pagos/cuotas requeridos del periodo
        RequiredPaymentsCalculation requiredPayments = calculateRequiredPayments(activeDebts);

        // Próximos vencimientos
        LocalDate today = LocalDate.now();
        List<DashboardNextDueResponse> upcomingDues = resolveUpcomingDues(activeDebts, today);
        DashboardNextDueResponse nextDue = upcomingDues.isEmpty() ? null : upcomingDues.get(0);

        // Progreso de deuda
        DashboardProgressResponse progress = calculateProgress(allDebts, activeDebts, allPayments, totalRegisteredDebt);

        // Fecha estimada libre de deudas
        PayoffProjection projection = resolveEstimatedDebtFreeDate(registeredDebtCount, activeDebtCount, activeStrategy);

        // Estado general de datos
        String status;
        if (registeredDebtCount == 0) {
            status = "EMPTY";
        } else if (!requiredPayments.hasData() && !projection.hasData() && !progress.hasProgressData()) {
            status = "INSUFFICIENT_DATA";
        } else {
            status = "SUCCESS";
        }

        return new DashboardSummaryResponse(
                totalRegisteredDebt,
                activeDebtCount,
                requiredPayments.amount(),
                requiredPayments.hasData(),
                nextDue,
                upcomingDues,
                availableForDebt,
                activeStrategy,
                progress,
                projection.date(),
                projection.hasData(),
                totalDeclaredDebts,
                registeredDebtCount,
                partialCoverage,
                status
        );
    }

    private RequiredPaymentsCalculation calculateRequiredPayments(List<Debt> activeDebts) {
        if (activeDebts.isEmpty()) {
            return new RequiredPaymentsCalculation(BigDecimal.ZERO, true);
        }

        BigDecimal sum = BigDecimal.ZERO;
        int definedCount = 0;

        for (Debt debt : activeDebts) {
            BigDecimal exigible = resolveExigiblePayment(debt);
            if (exigible != null) {
                sum = sum.add(exigible);
                definedCount++;
            }
        }

        if (definedCount > 0) {
            return new RequiredPaymentsCalculation(sum, true);
        } else {
            return new RequiredPaymentsCalculation(null, false);
        }
    }

    private BigDecimal resolveExigiblePayment(Debt debt) {
        if (debt == null) return null;
        DebtType type = debt.getType();
        Map<String, Object> details = debt.getDetails() != null ? debt.getDetails() : Map.of();

        switch (type) {
            case CREDIT_CARD -> {
                if (debt.getMinimumPayment() != null && debt.getMinimumPayment().compareTo(BigDecimal.ZERO) > 0) {
                    return debt.getMinimumPayment();
                }
                if (debt.getMonthlyPayment() != null && debt.getMonthlyPayment().compareTo(BigDecimal.ZERO) > 0) {
                    return debt.getMonthlyPayment();
                }
                return null;
            }
            case PERSONAL_LOAN, MORTGAGE, AUTO_LOAN, RETAIL_CREDIT, INSTALLMENT_PURCHASE -> {
                if (debt.getMonthlyPayment() != null && debt.getMonthlyPayment().compareTo(BigDecimal.ZERO) > 0) {
                    return debt.getMonthlyPayment();
                }
                BigDecimal detailPayment = extractPositiveDecimal(details.get("installmentAmount"));
                if (detailPayment == null) detailPayment = extractPositiveDecimal(details.get("monthlyPayment"));
                if (detailPayment != null && detailPayment.compareTo(BigDecimal.ZERO) > 0) {
                    return detailPayment;
                }
                return null;
            }
            case STUDENT_LOAN -> {
                String stage = String.valueOf(details.getOrDefault("stage", "")).toUpperCase();
                boolean hasObligation = Boolean.TRUE.equals(details.get("hasPaymentObligation"))
                        || Boolean.TRUE.equals(details.get("paymentExigible"))
                        || "AMORTIZACION".equals(stage)
                        || (debt.getMonthlyPayment() != null && debt.getMonthlyPayment().compareTo(BigDecimal.ZERO) > 0);
                if (hasObligation) {
                    if (debt.getMonthlyPayment() != null && debt.getMonthlyPayment().compareTo(BigDecimal.ZERO) > 0) {
                        return debt.getMonthlyPayment();
                    }
                    return null;
                }
                return BigDecimal.ZERO;
            }
            case OVERDUE_BILL -> {
                if (debt.getMonthlyPayment() != null && debt.getMonthlyPayment().compareTo(BigDecimal.ZERO) > 0) {
                    return debt.getMonthlyPayment();
                }
                BigDecimal agreed = extractPositiveDecimal(details.get("agreedPayment"));
                if (agreed == null) agreed = extractPositiveDecimal(details.get("paymentAgreement"));
                if (agreed == null) agreed = extractPositiveDecimal(details.get("settlementAmount"));
                if (agreed != null && agreed.compareTo(BigDecimal.ZERO) > 0) {
                    return agreed;
                }
                if (debt.getCurrentBalance() != null && debt.getCurrentBalance().compareTo(BigDecimal.ZERO) > 0) {
                    return debt.getCurrentBalance();
                }
                return null;
            }
            case FAMILY_LOAN, OTHER -> {
                if (debt.getMonthlyPayment() != null && debt.getMonthlyPayment().compareTo(BigDecimal.ZERO) > 0) {
                    return debt.getMonthlyPayment();
                }
                BigDecimal agreed = extractPositiveDecimal(details.get("agreedPayment"));
                if (agreed == null) agreed = extractPositiveDecimal(details.get("monthlyPayment"));
                if (agreed == null) agreed = extractPositiveDecimal(details.get("paymentAgreement"));
                if (agreed != null && agreed.compareTo(BigDecimal.ZERO) > 0) {
                    return agreed;
                }
                return null;
            }
        }
        return null;
    }

    private List<DashboardNextDueResponse> resolveUpcomingDues(List<Debt> activeDebts, LocalDate today) {
        List<DashboardNextDueResponse> upcoming = new ArrayList<>();

        for (Debt debt : activeDebts) {
            LocalDate resolvedDueDate = resolveDueDate(debt, today);
            if (resolvedDueDate == null) continue;

            long daysUntilDue = ChronoUnit.DAYS.between(today, resolvedDueDate);
            BigDecimal amount = resolveExigiblePayment(debt);
            if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
                amount = debt.getCurrentBalance();
            }

            upcoming.add(new DashboardNextDueResponse(
                    debt.getId(),
                    debt.getName(),
                    debt.getEntity(),
                    debt.getType(),
                    amount,
                    resolvedDueDate,
                    daysUntilDue
            ));
        }

        upcoming.sort(Comparator.comparing(DashboardNextDueResponse::dueDate));
        return upcoming;
    }

    private LocalDate resolveDueDate(Debt debt, LocalDate today) {
        if (debt.getNextDueDate() != null) {
            return debt.getNextDueDate();
        }
        if (debt.getDueDateDay() != null && debt.getDueDateDay() >= 1 && debt.getDueDateDay() <= 31) {
            int maxDayThisMonth = today.lengthOfMonth();
            int targetDay = Math.min(debt.getDueDateDay(), maxDayThisMonth);
            LocalDate candidate = today.withDayOfMonth(targetDay);
            if (candidate.isBefore(today)) {
                YearMonth nextMonth = YearMonth.from(today).plusMonths(1);
                candidate = nextMonth.atDay(Math.min(debt.getDueDateDay(), nextMonth.lengthOfMonth()));
            }
            return candidate;
        }
        return null;
    }

    private DashboardProgressResponse calculateProgress(
            List<Debt> allDebts,
            List<Debt> activeDebts,
            List<Payment> allPayments,
            BigDecimal totalRegisteredDebt) {

        BigDecimal totalRecordedPayments = allPayments.stream()
                .map(Payment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (allDebts.isEmpty()) {
            return new DashboardProgressResponse(BigDecimal.ZERO, BigDecimal.ZERO, totalRecordedPayments, 0, false);
        }

        // Sumar montos originales si están registrados
        BigDecimal totalOriginalDebt = BigDecimal.ZERO;
        boolean allHaveOriginalAmount = true;

        for (Debt debt : allDebts) {
            BigDecimal orig = debt.getOriginalAmount();
            if (orig != null && orig.compareTo(BigDecimal.ZERO) > 0) {
                totalOriginalDebt = totalOriginalDebt.add(orig);
            } else {
                allHaveOriginalAmount = false;
            }
        }

        if (allHaveOriginalAmount && totalOriginalDebt.compareTo(BigDecimal.ZERO) > 0 && totalOriginalDebt.compareTo(totalRegisteredDebt) >= 0) {
            BigDecimal paidSoFar = BigDecimal.ZERO;
            for (Debt debt : allDebts) {
                BigDecimal orig = debt.getOriginalAmount();
                BigDecimal bal = debt.getCurrentBalance() != null ? debt.getCurrentBalance() : BigDecimal.ZERO;
                if (orig != null) {
                    BigDecimal diff = orig.subtract(bal).max(BigDecimal.ZERO);
                    paidSoFar = paidSoFar.add(diff);
                }
            }

            int percentage = paidSoFar.divide(totalOriginalDebt, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .min(BigDecimal.valueOf(100))
                    .intValue();

            return new DashboardProgressResponse(totalOriginalDebt, paidSoFar, totalRecordedPayments, percentage, true);
        }

        // Si no se puede derivar con precisión el progreso del monto original
        return new DashboardProgressResponse(null, null, totalRecordedPayments, null, false);
    }

    private PayoffProjection resolveEstimatedDebtFreeDate(
            long registeredDebtCount,
            int activeDebtCount,
            StrategyType activeStrategy) {

        if (registeredDebtCount > 0 && activeDebtCount == 0) {
            return new PayoffProjection("Al día", true);
        }
        if (activeDebtCount == 0) {
            return new PayoffProjection(null, false);
        }

        try {
            StrategyComparisonResponse comparison = strategyService.compare(activeStrategy);
            StrategyStatsResponse stats = activeStrategy == StrategyType.AVALANCHE
                    ? comparison.avalanche()
                    : comparison.snowball();

            if (stats != null
                    && stats.months() > 0
                    && stats.months() < 600
                    && stats.payoffDate() != null
                    && !stats.payoffDate().isBlank()
                    && !"Revisar capacidad".equalsIgnoreCase(stats.payoffDate())) {
                return new PayoffProjection(stats.payoffDate(), true);
            }
        } catch (Exception ignored) {
            // Si no hay perfil o la proyección no puede calcularse, se mantiene como datos insuficientes
        }

        return new PayoffProjection(null, false);
    }

    private BigDecimal extractPositiveDecimal(Object value) {
        if (value == null) return null;
        if (value instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        try {
            BigDecimal bd = new BigDecimal(String.valueOf(value));
            return bd.compareTo(BigDecimal.ZERO) >= 0 ? bd : null;
        } catch (Exception e) {
            return null;
        }
    }

    private record RequiredPaymentsCalculation(BigDecimal amount, boolean hasData) {}
    private record PayoffProjection(String date, boolean hasData) {}
}

