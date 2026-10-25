package com.ceroa.service;

import com.ceroa.domain.Debt;
import com.ceroa.domain.Payment;
import com.ceroa.domain.PaymentType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Comparator;
import java.util.List;

/** Replays installment payments so editing or deleting a payment also restores its due date. */
final class PaymentSchedule {
    private PaymentSchedule() {}

    static void recalculate(Debt debt, List<Payment> payments) {
        LocalDate anchor = debt.getPaymentScheduleAnchor();
        if (anchor == null) {
            anchor = debt.getNextDueDate();
            if (anchor == null) return;
            debt.setPaymentScheduleAnchor(anchor);
        }
        if (debt.getType() == null) return;
        BigDecimal required = new DebtPaymentResolver().resolveExigiblePayment(debt);
        if (required == null || required.signum() <= 0) return;

        LocalDate due = anchor;
        // Use the payment due date, never the statement/cutoff day.
        int day = anchor.getDayOfMonth();
        LocalDate cycleStart = atDay(YearMonth.from(anchor).minusMonths(1), day).plusDays(1);
        BigDecimal paid = BigDecimal.ZERO;
        for (Payment payment : payments.stream()
                .sorted(Comparator.comparing(Payment::getDate)).toList()) {
            if (payment.getType() == PaymentType.EXTRA_PRINCIPAL
                    || payment.getDate().isBefore(cycleStart)
                    || (debt.getPaymentScheduleResetAt() != null && payment.getCreatedAt() != null
                        && payment.getCreatedAt().isBefore(debt.getPaymentScheduleResetAt()))) continue;
            paid = paid.add(payment.getAmount());
            if (paid.compareTo(required) >= 0) {
                // A late installment settles the pending cycle; resume on the next scheduled date.
                YearMonth month = YearMonth.from(due).plusMonths(1);
                LocalDate next = atDay(month, day);
                if (!next.isAfter(payment.getDate())) {
                    month = YearMonth.from(payment.getDate());
                    next = atDay(month, day);
                    if (!next.isAfter(payment.getDate())) next = atDay(month.plusMonths(1), day);
                }
                due = next;
                paid = BigDecimal.ZERO;
            }
        }
        debt.setNextDueDate(due);
    }

    private static LocalDate atDay(YearMonth month, int day) {
        return month.atDay(Math.min(day, month.lengthOfMonth()));
    }
}
