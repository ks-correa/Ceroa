package com.ceroa.service;

import com.ceroa.api.dto.DebtRequest;
import com.ceroa.api.dto.DebtResponse;
import com.ceroa.domain.*;
import com.ceroa.exception.BusinessRuleException;
import com.ceroa.repository.DebtRepository;
import com.ceroa.repository.PaymentRepository;
import com.ceroa.service.validation.DebtValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DebtServiceTest {

    @Mock DebtRepository debtRepository;
    @Mock PaymentRepository paymentRepository;
    @Mock CurrentUserService currentUser;

    private DebtValidator debtValidator;
    private DebtService service;

    @BeforeEach
    void setUp() {
        debtValidator = new DebtValidator();
        service = new DebtService(debtRepository, paymentRepository, currentUser, debtValidator);
    }

    @Test
    void rejectsThirdDebtForCeroPlan() {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setPlan(UserPlan.CERO);
        when(currentUser.entityForUpdate()).thenReturn(user);
        when(debtRepository.countByUserId(user.getId())).thenReturn(2L);

        assertThatThrownBy(() -> service.create(validLoanRequest()))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("máximo 2 deudas");

        verify(debtRepository, never()).save(any());
        verify(currentUser).entityForUpdate();
    }

    @Test
    void rejectsBalanceGreaterThanOriginalAmountForPersonalLoan() {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setPlan(UserPlan.PLUS);
        when(currentUser.entityForUpdate()).thenReturn(user);

        DebtRequest invalid = new DebtRequest(
                "Crédito", "Entidad", DebtType.PERSONAL_LOAN, null,
                BigDecimal.valueOf(1_000), BigDecimal.valueOf(1_001), BigDecimal.TEN,
                RateType.EA, BigDecimal.valueOf(100), BigDecimal.valueOf(100), 15,
                LocalDate.now().plusDays(15), LocalDate.now().minusMonths(1), 12, null, null, null, Map.of());

        assertThatThrownBy(() -> service.create(invalid))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("saldo actual");
    }

    @Test
    void systemCalculatesPaidStatusWhenBalanceIsZero() {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setPlan(UserPlan.PLUS);
        when(currentUser.entityForUpdate()).thenReturn(user);
        when(debtRepository.save(any(Debt.class))).thenAnswer(i -> {
            Debt d = i.getArgument(0);
            d.setId(UUID.randomUUID());
            return d;
        });

        DebtRequest paidCard = new DebtRequest(
                "Mi Tarjeta", "Banco", DebtType.CREDIT_CARD, null,
                BigDecimal.valueOf(5_000_000), BigDecimal.ZERO, BigDecimal.valueOf(25),
                RateType.EA, BigDecimal.ZERO, BigDecimal.ZERO, 15,
                LocalDate.now().plusDays(10), null, null, null, null, null,
                Map.of("statementDay", 5, "paymentDueDate", LocalDate.now().plusDays(10).toString()));

        DebtResponse response = service.create(paidCard);
        assertThat(response.status()).isEqualTo(DebtStatus.PAID);
    }

    @Test
    void systemCalculatesOverdueStatusForOverdueBill() {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setPlan(UserPlan.PLUS);
        when(currentUser.entityForUpdate()).thenReturn(user);
        when(debtRepository.save(any(Debt.class))).thenAnswer(i -> {
            Debt d = i.getArgument(0);
            d.setId(UUID.randomUUID());
            return d;
        });

        DebtRequest bill = new DebtRequest(
                "Factura luz", "Enel", DebtType.OVERDUE_BILL, null,
                BigDecimal.valueOf(150_000), BigDecimal.valueOf(150_000), BigDecimal.ZERO,
                RateType.NONE, BigDecimal.ZERO, BigDecimal.ZERO, null,
                null, null, null, null, null, null,
                Map.of("originalDueDate", LocalDate.now().minusDays(30).toString()));

        DebtResponse response = service.create(bill);
        assertThat(response.status()).isEqualTo(DebtStatus.OVERDUE);
    }

    @Test
    void systemCalculatesDueTodayStatus() {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setPlan(UserPlan.PLUS);
        when(currentUser.entityForUpdate()).thenReturn(user);
        when(debtRepository.save(any(Debt.class))).thenAnswer(i -> {
            Debt d = i.getArgument(0);
            d.setId(UUID.randomUUID());
            return d;
        });

        DebtRequest dueToday = new DebtRequest(
                "Crédito Libre", "Bancolombia", DebtType.PERSONAL_LOAN, null,
                BigDecimal.valueOf(10_000_000), BigDecimal.valueOf(8_000_000), BigDecimal.valueOf(18),
                RateType.EA, BigDecimal.valueOf(350_000), BigDecimal.valueOf(350_000), 15,
                LocalDate.now(), LocalDate.now().minusMonths(6), 24, null, null, null, Map.of());

        DebtResponse response = service.create(dueToday);
        assertThat(response.status()).isEqualTo(DebtStatus.DUE_TODAY);
    }

    private DebtRequest validLoanRequest() {
        return new DebtRequest(
                "Crédito", "Entidad", DebtType.PERSONAL_LOAN, null,
                BigDecimal.valueOf(1_000), BigDecimal.valueOf(800), BigDecimal.TEN,
                RateType.EA, BigDecimal.valueOf(100), BigDecimal.valueOf(100), 15,
                LocalDate.now().plusDays(20), LocalDate.now().minusMonths(1), 12, null, null, null, Map.of());
    }
}
