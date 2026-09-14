package com.ceroa.service;

import com.ceroa.api.dto.DebtRequest;
import com.ceroa.api.dto.DebtResponse;
import com.ceroa.domain.*;
import com.ceroa.exception.BusinessRuleException;
import com.ceroa.exception.ResourceNotFoundException;
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
import java.util.Optional;
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

    // --- HU-034: Consultar Detalle ---
    @Test
    void findByIdAuthorizedReturnsDetailWithPaymentCount() {
        UUID userId = UUID.randomUUID();
        UUID debtId = UUID.randomUUID();
        when(currentUser.id()).thenReturn(userId);

        Debt debt = new Debt();
        debt.setId(debtId);
        debt.setName("Crédito Vehicular");
        debt.setEntity("Banco XYZ");
        debt.setType(DebtType.AUTO_LOAN);
        debt.setCategoryLabel("Crédito de vehículo");
        debt.setCurrentBalance(BigDecimal.valueOf(15_000_000));
        debt.setOriginalAmount(BigDecimal.valueOf(30_000_000));
        debt.setRateType(RateType.EA);
        debt.setStatus(DebtStatus.CURRENT);

        when(debtRepository.findByIdAndUserId(debtId, userId)).thenReturn(Optional.of(debt));
        when(paymentRepository.countByDebtId(debtId)).thenReturn(4L);

        DebtResponse response = service.findById(debtId);

        assertThat(response.id()).isEqualTo(debtId);
        assertThat(response.name()).isEqualTo("Crédito Vehicular");
        assertThat(response.type()).isEqualTo(DebtType.AUTO_LOAN);
        assertThat(response.paymentCount()).isEqualTo(4L);
    }

    @Test
    void findByIdUnauthorizedThrowsNotFound() {
        UUID userId = UUID.randomUUID();
        UUID debtId = UUID.randomUUID();
        when(currentUser.id()).thenReturn(userId);
        when(debtRepository.findByIdAndUserId(debtId, userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.findById(debtId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("no encontrada");
    }

    // --- HU-035: Editar Deuda ---
    @Test
    void updateDebtSuccessfullyPersistsAndRecalculatesStatus() {
        UUID userId = UUID.randomUUID();
        UUID debtId = UUID.randomUUID();
        when(currentUser.id()).thenReturn(userId);

        Debt existing = new Debt();
        existing.setId(debtId);
        existing.setName("Nombre anterior");
        existing.setEntity("Entidad");
        existing.setType(DebtType.PERSONAL_LOAN);
        existing.setCategoryLabel("Préstamo personal");
        existing.setOriginalAmount(BigDecimal.valueOf(5_000_000));
        existing.setCurrentBalance(BigDecimal.valueOf(4_000_000));
        existing.setRateType(RateType.EA);
        existing.setStatus(DebtStatus.CURRENT);

        when(debtRepository.findByIdAndUserId(debtId, userId)).thenReturn(Optional.of(existing));
        when(debtRepository.save(any(Debt.class))).thenAnswer(i -> i.getArgument(0));

        DebtRequest updateRequest = new DebtRequest(
                "Nombre Actualizado", "Entidad Modificada", DebtType.PERSONAL_LOAN, null,
                BigDecimal.valueOf(5_000_000), BigDecimal.valueOf(3_000_000), BigDecimal.valueOf(15),
                RateType.EA, BigDecimal.valueOf(200_000), BigDecimal.valueOf(200_000), 20,
                LocalDate.now().plusDays(25), LocalDate.now().minusMonths(3), 18, "ACC-99", "Nota", "#112233", Map.of());

        DebtResponse response = service.update(debtId, updateRequest);

        assertThat(response.name()).isEqualTo("Nombre Actualizado");
        assertThat(response.entity()).isEqualTo("Entidad Modificada");
        assertThat(response.currentBalance()).isEqualByComparingTo("3000000");
        assertThat(response.status()).isEqualTo(DebtStatus.CURRENT);
    }

    @Test
    void updateDebtRejectsDebtTypeChange() {
        UUID userId = UUID.randomUUID();
        UUID debtId = UUID.randomUUID();
        when(currentUser.id()).thenReturn(userId);

        Debt existing = new Debt();
        existing.setId(debtId);
        existing.setType(DebtType.PERSONAL_LOAN);

        when(debtRepository.findByIdAndUserId(debtId, userId)).thenReturn(Optional.of(existing));

        DebtRequest changeTypeRequest = new DebtRequest(
                "Nuevo", "Banco", DebtType.CREDIT_CARD, null,
                BigDecimal.valueOf(5_000_000), BigDecimal.valueOf(2_000_000), BigDecimal.valueOf(25),
                RateType.EA, BigDecimal.ZERO, BigDecimal.valueOf(50_000), 10,
                LocalDate.now().plusDays(15), null, null, null, null, null,
                Map.of("creditLimit", 5_000_000, "statementDay", 10, "paymentDueDate", LocalDate.now().plusDays(15).toString()));

        assertThatThrownBy(() -> service.update(debtId, changeTypeRequest))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("No se permite cambiar el tipo");

        verify(debtRepository, never()).save(any());
    }

    @Test
    void updateDebtUnauthorizedThrowsNotFound() {
        UUID userId = UUID.randomUUID();
        UUID debtId = UUID.randomUUID();
        when(currentUser.id()).thenReturn(userId);
        when(debtRepository.findByIdAndUserId(debtId, userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.update(debtId, validLoanRequest()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("no encontrada");
    }

    // --- HU-036: Eliminar Deuda ---
    @Test
    void deleteDebtDeletesDebtAndItsPaymentsTransactionally() {
        UUID userId = UUID.randomUUID();
        UUID debtId = UUID.randomUUID();
        when(currentUser.id()).thenReturn(userId);

        Debt debt = new Debt();
        debt.setId(debtId);

        when(debtRepository.findByIdAndUserId(debtId, userId)).thenReturn(Optional.of(debt));

        service.delete(debtId);

        verify(paymentRepository).deleteAllByDebtId(debtId);
        verify(debtRepository).delete(debt);
    }

    @Test
    void deleteDebtUnauthorizedThrowsNotFound() {
        UUID userId = UUID.randomUUID();
        UUID debtId = UUID.randomUUID();
        when(currentUser.id()).thenReturn(userId);
        when(debtRepository.findByIdAndUserId(debtId, userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.delete(debtId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("no encontrada");

        verify(paymentRepository, never()).deleteAllByDebtId(any());
        verify(debtRepository, never()).delete(any());
    }

    private DebtRequest validLoanRequest() {
        return new DebtRequest(
                "Crédito", "Entidad", DebtType.PERSONAL_LOAN, null,
                BigDecimal.valueOf(1_000), BigDecimal.valueOf(800), BigDecimal.TEN,
                RateType.EA, BigDecimal.valueOf(100), BigDecimal.valueOf(100), 15,
                LocalDate.now().plusDays(20), LocalDate.now().minusMonths(1), 12, null, null, null, Map.of());
    }
}
