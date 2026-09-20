package com.ceroa.service;

import com.ceroa.api.dto.UpcomingDueResponse;
import com.ceroa.domain.Debt;
import com.ceroa.domain.DebtStatus;
import com.ceroa.domain.ReminderMilestone;
import com.ceroa.repository.DebtRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class UpcomingDueService {

    private final DebtRepository debtRepository;
    private final DebtPaymentResolver paymentResolver;
    private final CurrentUserService currentUser;
    private final DebtService debtService;

    public UpcomingDueService(
            DebtRepository debtRepository,
            DebtPaymentResolver paymentResolver,
            CurrentUserService currentUser,
            DebtService debtService) {
        this.debtRepository = debtRepository;
        this.paymentResolver = paymentResolver != null ? paymentResolver : new DebtPaymentResolver();
        this.currentUser = currentUser;
        this.debtService = debtService;
    }

    @Transactional(readOnly = true)
    public List<UpcomingDueResponse> getUpcomingDues() {
        return getUpcomingDues(currentUser.id(), LocalDate.now(ZoneId.of("America/Bogota")));
    }

    @Transactional(readOnly = true)
    public List<UpcomingDueResponse> getUpcomingDues(UUID userId, LocalDate today) {
        List<Debt> allDebts = debtRepository.findAllByUserIdOrderByCreatedAtDesc(userId);
        List<UpcomingDueResponse> result = new ArrayList<>();

        for (Debt debt : allDebts) {
            // Deudas pagadas o sin saldo pendiente no deben aparecer como vencimiento pendiente
            if (debt.getStatus() == DebtStatus.PAID
                    || debt.getCurrentBalance() == null
                    || debt.getCurrentBalance().compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            LocalDate resolvedDueDate = resolveDueDate(debt, today);
            if (resolvedDueDate == null) {
                continue;
            }

            long daysUntilDue = ChronoUnit.DAYS.between(today, resolvedDueDate);
            BigDecimal amount = resolveExigibleAmount(debt);
            DebtStatus status = debtService.calculateSystemStatus(debt);
            ReminderMilestone milestone = calculateMilestone(daysUntilDue, status);

            result.add(new UpcomingDueResponse(
                    debt.getId(),
                    debt.getName(),
                    debt.getEntity(),
                    debt.getType(),
                    amount,
                    resolvedDueDate,
                    daysUntilDue,
                    status,
                    milestone
            ));
        }

        result.sort(Comparator.comparing(UpcomingDueResponse::dueDate));
        return result;
    }

    @Transactional(readOnly = true)
    public UpcomingDueResponse getUpcomingDueForDebt(UUID debtId) {
        return getUpcomingDueForDebt(debtId, currentUser.id(), LocalDate.now(ZoneId.of("America/Bogota")));
    }

    @Transactional(readOnly = true)
    public UpcomingDueResponse getUpcomingDueForDebt(UUID debtId, UUID userId, LocalDate today) {
        Debt debt = debtRepository.findByIdAndUserId(debtId, userId).orElse(null);
        if (debt == null) {
            return null;
        }

        LocalDate resolvedDueDate = resolveDueDate(debt, today);
        if (resolvedDueDate == null) {
            return null;
        }

        long daysUntilDue = ChronoUnit.DAYS.between(today, resolvedDueDate);
        BigDecimal amount = resolveExigibleAmount(debt);
        DebtStatus status = debtService.calculateSystemStatus(debt);
        ReminderMilestone milestone = (status == DebtStatus.PAID) ? ReminderMilestone.NONE : calculateMilestone(daysUntilDue, status);

        return new UpcomingDueResponse(
                debt.getId(),
                debt.getName(),
                debt.getEntity(),
                debt.getType(),
                amount,
                resolvedDueDate,
                daysUntilDue,
                status,
                milestone
        );
    }

    public LocalDate resolveDueDate(Debt debt, LocalDate today) {
        if (debt == null) return null;
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

    public BigDecimal resolveExigibleAmount(Debt debt) {
        BigDecimal amount = paymentResolver.resolveExigiblePayment(debt);
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            return debt.getCurrentBalance() != null ? debt.getCurrentBalance() : BigDecimal.ZERO;
        }
        return amount;
    }

    public ReminderMilestone calculateMilestone(long daysUntilDue, DebtStatus status) {
        if (status == DebtStatus.PAID) {
            return ReminderMilestone.NONE;
        }
        if (daysUntilDue == 7) {
            return ReminderMilestone.SEVEN_DAYS;
        }
        if (daysUntilDue == 3) {
            return ReminderMilestone.THREE_DAYS;
        }
        if (daysUntilDue == 0) {
            return ReminderMilestone.DUE_TODAY;
        }
        return ReminderMilestone.NONE;
    }
}

