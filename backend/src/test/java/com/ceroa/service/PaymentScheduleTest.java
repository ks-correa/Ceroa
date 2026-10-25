package com.ceroa.service;

import com.ceroa.domain.*;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import static org.assertj.core.api.Assertions.assertThat;

class PaymentScheduleTest {
    @Test
    void lateInstallmentAdvancesToNextDueDate() {
        Debt debt = debt("2026-10-15");
        PaymentSchedule.recalculate(debt, List.of(payment("2026-10-25", "100", PaymentType.INSTALLMENT)));
        assertThat(debt.getNextDueDate()).isEqualTo("2026-11-15");
    }

    @Test
    void partialPaymentsOnlyAdvanceOnceTheyCoverTheInstallment() {
        Debt debt = debt("2026-10-15");
        Payment first = payment("2026-10-20", "40", PaymentType.MINIMUM);
        PaymentSchedule.recalculate(debt, List.of(first));
        assertThat(debt.getNextDueDate()).isEqualTo("2026-10-15");
        PaymentSchedule.recalculate(debt, List.of(first, payment("2026-10-25", "60", PaymentType.MINIMUM)));
        assertThat(debt.getNextDueDate()).isEqualTo("2026-11-15");
    }

    @Test
    void editingOrDeletingThePaymentRestoresThePendingCycle() {
        Debt debt = debt("2026-10-15");
        Payment payment = payment("2026-10-25", "100", PaymentType.INSTALLMENT);
        PaymentSchedule.recalculate(debt, List.of(payment));
        payment.setAmount(new BigDecimal("50"));
        PaymentSchedule.recalculate(debt, List.of(payment));
        assertThat(debt.getNextDueDate()).isEqualTo("2026-10-15");
        PaymentSchedule.recalculate(debt, List.of());
        assertThat(debt.getNextDueDate()).isEqualTo("2026-10-15");
    }

    @Test
    void preservesMonthEndAcrossFebruaryAndSubsequentCycles() {
        Debt debt = debt("2026-01-31");
        Payment january = payment("2026-01-31", "100", PaymentType.INSTALLMENT);
        PaymentSchedule.recalculate(debt, List.of(january));
        assertThat(debt.getNextDueDate()).isEqualTo("2026-02-28");
        PaymentSchedule.recalculate(debt, List.of(january, payment("2026-02-28", "100", PaymentType.INSTALLMENT)));
        assertThat(debt.getNextDueDate()).isEqualTo("2026-03-31");
    }

    @Test
    void historicalPaymentsAndExtraPrincipalDoNotSettleThePendingInstallment() {
        Debt debt = debt("2026-10-15");
        PaymentSchedule.recalculate(debt, List.of(payment("2026-08-15", "100", PaymentType.INSTALLMENT),
                payment("2026-10-25", "200", PaymentType.EXTRA_PRINCIPAL)));
        assertThat(debt.getNextDueDate()).isEqualTo("2026-10-15");
    }

    @Test
    void changingPaymentDateRecalculatesTheNextCycle() {
        Debt debt = debt("2026-10-15");
        Payment payment = payment("2026-11-20", "100", PaymentType.INSTALLMENT);
        PaymentSchedule.recalculate(debt, List.of(payment));
        assertThat(debt.getNextDueDate()).isEqualTo("2026-12-15");
        payment.setDate(LocalDate.parse("2026-10-25"));
        PaymentSchedule.recalculate(debt, List.of(payment));
        assertThat(debt.getNextDueDate()).isEqualTo("2026-11-15");
    }

    private Debt debt(String due) {
        Debt debt = new Debt();
        debt.setType(DebtType.CREDIT_CARD);
        debt.setCurrentBalance(new BigDecimal("1000"));
        debt.setMinimumPayment(new BigDecimal("100"));
        debt.setNextDueDate(LocalDate.parse(due));
        debt.setDueDateDay(5); // A statement day must not move the payment due day.
        return debt;
    }

    private Payment payment(String date, String amount, PaymentType type) {
        Payment payment = new Payment();
        payment.setDate(LocalDate.parse(date));
        payment.setAmount(new BigDecimal(amount));
        payment.setType(type);
        return payment;
    }
}
