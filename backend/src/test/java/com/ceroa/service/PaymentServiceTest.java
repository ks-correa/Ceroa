package com.ceroa.service;

import com.ceroa.api.dto.PaymentRequest;
import com.ceroa.domain.Debt;
import com.ceroa.domain.Payment;
import com.ceroa.domain.PaymentType;
import com.ceroa.exception.BusinessRuleException;
import com.ceroa.repository.DebtRepository;
import com.ceroa.repository.PaymentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock PaymentRepository paymentRepository;
    @Mock DebtRepository debtRepository;
    @Mock DebtService debtService;
    @Mock CurrentUserService currentUser;

    private PaymentService service;

    @BeforeEach
    void setUp() {
        service = new PaymentService(paymentRepository, debtRepository, debtService, currentUser);
    }

    @Test
    void subtractsConfirmedPaymentFromDebtBalance() {
        UUID debtId = UUID.randomUUID();
        Debt debt = debt(debtId, "1000", "1500");
        when(debtService.findEntity(debtId)).thenReturn(debt);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.create(new PaymentRequest(
                debtId, PaymentType.EXTRA_PRINCIPAL, BigDecimal.valueOf(250), LocalDate.now(), "Abono"));

        assertThat(debt.getCurrentBalance()).isEqualByComparingTo("750");
        verify(debtRepository).save(debt);
    }

    @Test
    void rejectsFuturePaymentDate() {
        PaymentRequest request = new PaymentRequest(
                UUID.randomUUID(), PaymentType.INSTALLMENT, BigDecimal.TEN, LocalDate.now().plusDays(1), null);

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("no puede ser futura");
        verifyNoInteractions(debtService, paymentRepository, debtRepository);
    }

    private Debt debt(UUID id, String balance, String original) {
        Debt debt = new Debt();
        debt.setId(id);
        debt.setName("Deuda de prueba");
        debt.setCurrentBalance(new BigDecimal(balance));
        debt.setOriginalAmount(new BigDecimal(original));
        return debt;
    }
}
