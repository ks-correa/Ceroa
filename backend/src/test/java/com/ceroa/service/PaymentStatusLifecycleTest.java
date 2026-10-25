package com.ceroa.service;

import com.ceroa.api.dto.PaymentRequest;
import com.ceroa.domain.*;
import com.ceroa.repository.*;
import com.ceroa.service.validation.DebtValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class PaymentStatusLifecycleTest {
    private final UUID userId = UUID.randomUUID();
    private final Debt debt = new Debt();
    private final List<Payment> payments = new ArrayList<>();
    private final PaymentRepository paymentRepository = mock(PaymentRepository.class);
    private PaymentService service;
    private DebtService debtService;
    private LocalDate overdueDate;

    @BeforeEach
    void setUp() {
        DebtRepository debtRepository = mock(DebtRepository.class);
        CurrentUserService user = mock(CurrentUserService.class);
        when(user.id()).thenReturn(userId);
        debt.setId(UUID.randomUUID());
        debt.setName("Tarjeta");
        debt.setType(DebtType.CREDIT_CARD);
        debt.setMinimumPayment(new BigDecimal("100"));
        debt.setCurrentBalance(new BigDecimal("1000"));
        overdueDate = LocalDate.now().minusDays(5);
        debt.setNextDueDate(overdueDate);
        debt.setStatus(DebtStatus.OVERDUE);
        when(debtRepository.findByIdAndUserId(debt.getId(), userId)).thenReturn(Optional.of(debt));
        when(paymentRepository.findAllByDebtIdAndDebtUserIdOrderByDateDescCreatedAtDesc(debt.getId(), userId))
                .thenAnswer(i -> new ArrayList<>(payments));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(i -> {
            Payment payment = i.getArgument(0);
            if (payment.getId() == null) { payment.setId(UUID.randomUUID()); payments.add(payment); }
            return payment;
        });
        when(paymentRepository.findByIdAndDebtUserId(any(), any())).thenAnswer(i -> payments.stream()
                .filter(p -> p.getId().equals(i.getArgument(0))).findFirst());
        doAnswer(i -> { payments.remove(i.getArgument(0)); return null; }).when(paymentRepository).delete(any(Payment.class));
        debtService = new DebtService(debtRepository, paymentRepository, user, mock(DebtValidator.class));
        service = new PaymentService(paymentRepository, debtRepository, debtService, user);
    }

    @Test
    void payingTheInstallmentLateUpdatesBothPaymentResponseAndDebtRead() {
        var response = service.create(request("100"));
        assertThat(response.debtStatus()).isEqualTo(DebtStatus.CURRENT);
        assertThat(debtService.findById(debt.getId()).status()).isEqualTo(DebtStatus.CURRENT);
        assertThat(debt.getNextDueDate()).isAfter(LocalDate.now());
        assertThat(debt.getCurrentBalance()).isEqualByComparingTo("900");
    }

    @Test
    void deletingTheInstallmentRestoresOverdueStateAndOriginalDueDate() {
        var response = service.create(request("100"));
        var deleted = service.delete(response.id());
        assertThat(deleted.debtStatus()).isEqualTo(DebtStatus.OVERDUE);
        assertThat(debt.getNextDueDate()).isEqualTo(overdueDate);
        assertThat(debt.getCurrentBalance()).isEqualByComparingTo("1000");
    }

    @Test
    void loweringThePaymentBelowMinimumRestoresOverdueAndCompletingItClearsIt() {
        var response = service.create(request("100"));
        var edited = service.update(response.id(), request("40"));
        assertThat(edited.debtStatus()).isEqualTo(DebtStatus.OVERDUE);
        var completed = service.create(request("60"));
        assertThat(completed.debtStatus()).isEqualTo(DebtStatus.CURRENT);
        assertThat(debt.getCurrentBalance()).isEqualByComparingTo("900");
    }

    @Test
    void fullyPayingStillClosesTheDebt() {
        var response = service.create(new PaymentRequest(debt.getId(), PaymentType.FULL,
                new BigDecimal("1000"), LocalDate.now(), null));
        assertThat(response.debtStatus()).isEqualTo(DebtStatus.PAID);
        assertThat(debt.getCurrentBalance()).isZero();
    }

    private PaymentRequest request(String amount) {
        return new PaymentRequest(debt.getId(), PaymentType.MINIMUM, new BigDecimal(amount), LocalDate.now(), null);
    }
}
