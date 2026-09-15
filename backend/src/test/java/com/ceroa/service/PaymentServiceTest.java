package com.ceroa.service;

import com.ceroa.api.dto.PaymentMutationResponse;
import com.ceroa.api.dto.PaymentRequest;
import com.ceroa.api.dto.PaymentResponse;
import com.ceroa.domain.Debt;
import com.ceroa.domain.DebtStatus;
import com.ceroa.domain.Payment;
import com.ceroa.domain.PaymentType;
import com.ceroa.exception.BusinessRuleException;
import com.ceroa.exception.ResourceNotFoundException;
import com.ceroa.repository.DebtRepository;
import com.ceroa.repository.PaymentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
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
    private final UUID testUserId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new PaymentService(paymentRepository, debtRepository, debtService, currentUser);
        lenient().when(currentUser.id()).thenReturn(testUserId);
    }

    // =========================================================================
    // HU-042: CREACIÓN DE PAGO
    // =========================================================================

    @Test
    @DisplayName("HU-042: Aplica impacto financiero reduciendo el saldo exactamente por el monto pagado")
    void createPaymentSubtractsAmountFromDebtBalance() {
        UUID debtId = UUID.randomUUID();
        Debt debt = debt(debtId, "1000000", "1500000");
        when(debtService.findEntity(debtId)).thenReturn(debt);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PaymentResponse response = service.create(new PaymentRequest(
                debtId, PaymentType.EXTRA_PRINCIPAL, BigDecimal.valueOf(250000), LocalDate.now(), "Abono adicional"));

        assertThat(debt.getCurrentBalance()).isEqualByComparingTo("750000");
        assertThat(response.debtCurrentBalance()).isEqualByComparingTo("750000");
        assertThat(response.type()).isEqualTo(PaymentType.EXTRA_PRINCIPAL);
        assertThat(response.typeLabel()).isEqualTo("Abono adicional");
        verify(debtService).updateDebtStatus(debt);
        verify(debtRepository).save(debt);
        verify(paymentRepository).save(any(Payment.class));
    }

    @Test
    @DisplayName("HU-042: Pago total validado por backend contra saldo vigente deja saldo en cero")
    void createFullPaymentValidatesAgainstBalance() {
        UUID debtId = UUID.randomUUID();
        Debt debt = debt(debtId, "400000", "1000000");
        when(debtService.findEntity(debtId)).thenReturn(debt);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PaymentResponse response = service.create(new PaymentRequest(
                debtId, PaymentType.FULL, BigDecimal.valueOf(400000), LocalDate.now(), "Pago total de la deuda"));

        assertThat(debt.getCurrentBalance()).isEqualByComparingTo("0");
        assertThat(response.debtCurrentBalance()).isEqualByComparingTo("0");
        verify(debtService).updateDebtStatus(debt);
        verify(debtRepository).save(debt);
    }

    @Test
    @DisplayName("HU-042: Rechaza Pago total si el monto no coincide con el saldo vigente")
    void createFullPaymentRejectsMismatchingAmount() {
        UUID debtId = UUID.randomUUID();
        Debt debt = debt(debtId, "500000", "1000000");
        when(debtService.findEntity(debtId)).thenReturn(debt);

        PaymentRequest request = new PaymentRequest(
                debtId, PaymentType.FULL, BigDecimal.valueOf(450000), LocalDate.now(), "Monto incorrecto");

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("coincidir exactamente con el saldo actual");

        assertThat(debt.getCurrentBalance()).isEqualByComparingTo("500000");
        verify(debtRepository, never()).save(any());
        verify(paymentRepository, never()).save(any());
    }

    @Test
    @DisplayName("HU-042: Rechaza fecha futura")
    void createRejectsFutureDate() {
        PaymentRequest request = new PaymentRequest(
                UUID.randomUUID(), PaymentType.INSTALLMENT, BigDecimal.TEN, LocalDate.now().plusDays(1), null);

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("no puede ser futura");
        verifyNoInteractions(debtService, paymentRepository, debtRepository);
    }

    @Test
    @DisplayName("HU-042: Rechaza monto cero o negativo")
    void createRejectsZeroOrNegativeAmount() {
        PaymentRequest requestZero = new PaymentRequest(
                UUID.randomUUID(), PaymentType.MINIMUM, BigDecimal.ZERO, LocalDate.now(), null);

        assertThatThrownBy(() -> service.create(requestZero))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("mayor que cero");

        PaymentRequest requestNeg = new PaymentRequest(
                UUID.randomUUID(), PaymentType.MINIMUM, BigDecimal.valueOf(-50), LocalDate.now(), null);

        assertThatThrownBy(() -> service.create(requestNeg))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("mayor que cero");
    }

    @Test
    @DisplayName("HU-042: Rechaza pago que supere el saldo actual de la obligación")
    void createRejectsAmountExceedingBalance() {
        UUID debtId = UUID.randomUUID();
        Debt debt = debt(debtId, "100000", "500000");
        when(debtService.findEntity(debtId)).thenReturn(debt);

        PaymentRequest request = new PaymentRequest(
                debtId, PaymentType.INSTALLMENT, BigDecimal.valueOf(150000), LocalDate.now(), null);

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("no puede superar el saldo actual");
        verify(debtRepository, never()).save(any());
    }

    // =========================================================================
    // HU-043: EDICIÓN DE PAGO
    // =========================================================================

    @Test
    @DisplayName("HU-043: Editar pago revierte efecto anterior y aplica el nuevo correctamente")
    void updateRevertsPreviousAndAppliesNewEffect() {
        UUID debtId = UUID.randomUUID();
        UUID paymentId = UUID.randomUUID();
        Debt debt = debt(debtId, "700000", "1000000");

        Payment existingPayment = new Payment();
        existingPayment.setId(paymentId);
        existingPayment.setDebt(debt);
        existingPayment.setAmount(BigDecimal.valueOf(300000));
        existingPayment.setType(PaymentType.INSTALLMENT);
        existingPayment.setDate(LocalDate.now());

        when(paymentRepository.findByIdAndDebtUserId(paymentId, testUserId)).thenReturn(Optional.of(existingPayment));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Editamos de 300,000 a 400,000
        PaymentResponse response = service.update(paymentId, new PaymentRequest(
                debtId, PaymentType.EXTRA_PRINCIPAL, BigDecimal.valueOf(400000), LocalDate.now(), "Nota editada"));

        // Saldo anterior 700k + 300k revertido = 1M; nuevo monto 400k -> saldo final = 600k
        assertThat(debt.getCurrentBalance()).isEqualByComparingTo("600000");
        assertThat(response.debtCurrentBalance()).isEqualByComparingTo("600000");
        assertThat(existingPayment.getAmount()).isEqualByComparingTo("400000");
        assertThat(existingPayment.getType()).isEqualTo(PaymentType.EXTRA_PRINCIPAL);
        assertThat(existingPayment.getNotes()).isEqualTo("Nota editada");
        verify(debtRepository).save(debt);
        verify(paymentRepository).save(existingPayment);
    }

    @Test
    @DisplayName("HU-043: Editar reduciendo el monto restituye saldo correctamente")
    void updateDecreasingAmountIncreasesBalance() {
        UUID debtId = UUID.randomUUID();
        UUID paymentId = UUID.randomUUID();
        Debt debt = debt(debtId, "500000", "1000000");

        Payment existingPayment = new Payment();
        existingPayment.setId(paymentId);
        existingPayment.setDebt(debt);
        existingPayment.setAmount(BigDecimal.valueOf(500000));
        existingPayment.setType(PaymentType.EXTRA_PRINCIPAL);
        existingPayment.setDate(LocalDate.now());

        when(paymentRepository.findByIdAndDebtUserId(paymentId, testUserId)).thenReturn(Optional.of(existingPayment));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Reducimos de 500k a 200k
        service.update(paymentId, new PaymentRequest(
                debtId, PaymentType.EXTRA_PRINCIPAL, BigDecimal.valueOf(200000), LocalDate.now(), null));

        // 500k + 500k = 1M; 1M - 200k = 800k
        assertThat(debt.getCurrentBalance()).isEqualByComparingTo("800000");
        verify(debtRepository).save(debt);
    }

    @Test
    @DisplayName("HU-043: Rechaza cambiar arbitrariamente la deuda asociada en edición")
    void updateRejectsChangingAssociatedDebt() {
        UUID debtId1 = UUID.randomUUID();
        UUID debtId2 = UUID.randomUUID();
        UUID paymentId = UUID.randomUUID();
        Debt debt1 = debt(debtId1, "500000", "1000000");

        Payment existingPayment = new Payment();
        existingPayment.setId(paymentId);
        existingPayment.setDebt(debt1);
        existingPayment.setAmount(BigDecimal.valueOf(100000));
        existingPayment.setDate(LocalDate.now());

        when(paymentRepository.findByIdAndDebtUserId(paymentId, testUserId)).thenReturn(Optional.of(existingPayment));

        PaymentRequest request = new PaymentRequest(
                debtId2, PaymentType.MINIMUM, BigDecimal.valueOf(100000), LocalDate.now(), null);

        assertThatThrownBy(() -> service.update(paymentId, request))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("transferir un pago a una deuda diferente");

        assertThat(debt1.getCurrentBalance()).isEqualByComparingTo("500000");
        verify(debtRepository, never()).save(any());
    }

    @Test
    @DisplayName("HU-043: Edición con Pago total se valida contra saldo restaurado")
    void updateFullPaymentValidatesAgainstRestoredBalance() {
        UUID debtId = UUID.randomUUID();
        UUID paymentId = UUID.randomUUID();
        Debt debt = debt(debtId, "300000", "1000000");

        Payment existingPayment = new Payment();
        existingPayment.setId(paymentId);
        existingPayment.setDebt(debt);
        existingPayment.setAmount(BigDecimal.valueOf(200000));
        existingPayment.setType(PaymentType.MINIMUM);
        existingPayment.setDate(LocalDate.now());

        when(paymentRepository.findByIdAndDebtUserId(paymentId, testUserId)).thenReturn(Optional.of(existingPayment));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Saldo restaurado es 300k + 200k = 500k. Pago total de 500k es válido.
        service.update(paymentId, new PaymentRequest(
                debtId, PaymentType.FULL, BigDecimal.valueOf(500000), LocalDate.now(), "Total"));

        assertThat(debt.getCurrentBalance()).isEqualByComparingTo("0");
    }

    @Test
    @DisplayName("HU-043: Ediciones sucesivas no acumulan errores de redondeo o cálculo")
    void multipleEditsDoNotAccumulateErrors() {
        UUID debtId = UUID.randomUUID();
        UUID paymentId = UUID.randomUUID();
        Debt debt = debt(debtId, "700000", "1000000");

        Payment payment = new Payment();
        payment.setId(paymentId);
        payment.setDebt(debt);
        payment.setAmount(BigDecimal.valueOf(300000));
        payment.setType(PaymentType.INSTALLMENT);
        payment.setDate(LocalDate.now());

        when(paymentRepository.findByIdAndDebtUserId(paymentId, testUserId)).thenReturn(Optional.of(payment));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // 1. Edición de 300k a 100k -> saldo = 900k
        service.update(paymentId, new PaymentRequest(debtId, PaymentType.MINIMUM, BigDecimal.valueOf(100000), LocalDate.now(), null));
        assertThat(debt.getCurrentBalance()).isEqualByComparingTo("900000");

        // 2. Edición de 100k a 500k -> saldo = 500k
        service.update(paymentId, new PaymentRequest(debtId, PaymentType.MINIMUM, BigDecimal.valueOf(500000), LocalDate.now(), null));
        assertThat(debt.getCurrentBalance()).isEqualByComparingTo("500000");

        // 3. Edición de vuelta a 300k -> saldo original = 700k
        service.update(paymentId, new PaymentRequest(debtId, PaymentType.MINIMUM, BigDecimal.valueOf(300000), LocalDate.now(), null));
        assertThat(debt.getCurrentBalance()).isEqualByComparingTo("700000");
    }

    // =========================================================================
    // HU-044: ELIMINACIÓN DE PAGO
    // =========================================================================

    @Test
    @DisplayName("HU-044: Eliminar pago revierte exactamente el monto en el saldo de la deuda")
    void deletePaymentRevertsBalanceCorrectly() {
        UUID debtId = UUID.randomUUID();
        UUID paymentId = UUID.randomUUID();
        Debt debt = debt(debtId, "650000", "1000000");

        Payment payment = new Payment();
        payment.setId(paymentId);
        payment.setDebt(debt);
        payment.setAmount(BigDecimal.valueOf(350000));
        payment.setDate(LocalDate.now());

        when(paymentRepository.findByIdAndDebtUserId(paymentId, testUserId)).thenReturn(Optional.of(payment));

        PaymentMutationResponse response = service.delete(paymentId);

        assertThat(debt.getCurrentBalance()).isEqualByComparingTo("1000000");
        assertThat(response.debtCurrentBalance()).isEqualByComparingTo("1000000");
        assertThat(response.amount()).isEqualByComparingTo("350000");
        verify(debtService).updateDebtStatus(debt);
        verify(debtRepository).save(debt);
        verify(paymentRepository).delete(payment);
    }

    @Test
    @DisplayName("HU-044: No aplica tope restoredBalance <= originalAmount (soporta originalAmount nulo)")
    void deleteDoesNotCapAtOriginalAmountWhenNullOrDifferent() {
        UUID debtId = UUID.randomUUID();
        UUID paymentId = UUID.randomUUID();
        // Deuda familiar sin originalAmount
        Debt debt = new Debt();
        debt.setId(debtId);
        debt.setName("Préstamo familiar");
        debt.setCurrentBalance(new BigDecimal("200000"));
        debt.setOriginalAmount(null);

        Payment payment = new Payment();
        payment.setId(paymentId);
        payment.setDebt(debt);
        payment.setAmount(BigDecimal.valueOf(500000));
        payment.setDate(LocalDate.now());

        when(paymentRepository.findByIdAndDebtUserId(paymentId, testUserId)).thenReturn(Optional.of(payment));

        service.delete(paymentId);

        // Saldo se restaura sin NPE a 700,000
        assertThat(debt.getCurrentBalance()).isEqualByComparingTo("700000");
        verify(debtRepository).save(debt);
    }

    // =========================================================================
    // CONSULTA Y AUTORIZACIÓN
    // =========================================================================

    @Test
    @DisplayName("Consultar pagos de una deuda verifica pertenencia antes de consultar el repositorio")
    void findAllByDebtIdValidatesOwnership() {
        UUID debtId = UUID.randomUUID();
        when(debtService.findEntity(debtId)).thenThrow(new ResourceNotFoundException("Deuda no encontrada"));

        assertThatThrownBy(() -> service.findAll(debtId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Deuda no encontrada");

        verify(paymentRepository, never()).findAllByDebtIdAndDebtUserIdOrderByDateDescCreatedAtDesc(any(), any());
    }

    private Debt debt(UUID id, String balance, String original) {
        Debt debt = new Debt();
        debt.setId(id);
        debt.setName("Deuda de prueba");
        debt.setCurrentBalance(new BigDecimal(balance));
        debt.setOriginalAmount(original != null ? new BigDecimal(original) : null);
        debt.setStatus(DebtStatus.CURRENT);
        return debt;
    }
}
