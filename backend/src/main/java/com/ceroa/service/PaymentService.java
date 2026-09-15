package com.ceroa.service;

import com.ceroa.api.dto.PaymentMutationResponse;
import com.ceroa.api.dto.PaymentRequest;
import com.ceroa.api.dto.PaymentResponse;
import com.ceroa.domain.Debt;
import com.ceroa.domain.Payment;
import com.ceroa.domain.PaymentType;
import com.ceroa.exception.BusinessRuleException;
import com.ceroa.exception.ResourceNotFoundException;
import com.ceroa.repository.DebtRepository;
import com.ceroa.repository.PaymentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class PaymentService {
    private final PaymentRepository paymentRepository;
    private final DebtRepository debtRepository;
    private final DebtService debtService;
    private final CurrentUserService currentUser;

    public PaymentService(
            PaymentRepository paymentRepository,
            DebtRepository debtRepository,
            DebtService debtService,
            CurrentUserService currentUser) {
        this.paymentRepository = paymentRepository;
        this.debtRepository = debtRepository;
        this.debtService = debtService;
        this.currentUser = currentUser;
    }

    @Transactional(readOnly = true)
    public List<PaymentResponse> findAll(UUID debtId) {
        if (debtId != null) {
            debtService.findEntity(debtId);
            return paymentRepository.findAllByDebtIdAndDebtUserIdOrderByDateDescCreatedAtDesc(debtId, currentUser.id())
                    .stream().map(this::toResponse).toList();
        }
        return paymentRepository.findAllByDebtUserIdOrderByDateDescCreatedAtDesc(currentUser.id())
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public PaymentResponse findById(UUID id) {
        return toResponse(findEntity(id));
    }

    @Transactional
    public PaymentResponse create(PaymentRequest request) {
        validateDate(request.date());
        validateAmountGreaterThanZero(request.amount());
        Debt debt = debtService.findEntity(request.debtId());

        if (request.type() == PaymentType.FULL) {
            validateFullPaymentAmount(request.amount(), debt.getCurrentBalance());
        }

        applyPaymentImpact(debt, request.amount());
        debtRepository.save(debt);

        Payment payment = new Payment();
        payment.setDebt(debt);
        apply(payment, request);
        Payment savedPayment = paymentRepository.save(payment);
        return toResponse(savedPayment);
    }

    @Transactional
    public PaymentResponse update(UUID id, PaymentRequest request) {
        validateDate(request.date());
        validateAmountGreaterThanZero(request.amount());
        Payment payment = findEntity(id);
        Debt debt = payment.getDebt();

        if (request.debtId() != null && !request.debtId().equals(debt.getId())) {
            throw new BusinessRuleException("IMMUTABLE_PAYMENT_DEBT", "No se permite transferir un pago a una deuda diferente.");
        }

        // 1. Revertir exactamente el efecto previamente confirmado
        revertPaymentImpact(debt, payment.getAmount());

        // 2. Validar nuevo pago contra el estado restaurado de la obligación
        if (request.type() == PaymentType.FULL) {
            validateFullPaymentAmount(request.amount(), debt.getCurrentBalance());
        }

        // 3. Aplicar el nuevo efecto financiero
        applyPaymentImpact(debt, request.amount());
        debtRepository.save(debt);

        // 4. Actualizar movimiento
        apply(payment, request);
        Payment savedPayment = paymentRepository.save(payment);
        return toResponse(savedPayment);
    }

    @Transactional
    public PaymentMutationResponse delete(UUID id) {
        Payment payment = findEntity(id);
        Debt debt = payment.getDebt();
        BigDecimal oldAmount = payment.getAmount();

        // Revertir exactamente el efecto confirmado del movimiento
        revertPaymentImpact(debt, oldAmount);
        debtRepository.save(debt);

        paymentRepository.delete(payment);
        return new PaymentMutationResponse(
                payment.getId(),
                debt.getId(),
                debt.getName(),
                oldAmount,
                debt.getCurrentBalance(),
                debt.getStatus(),
                debt.getOriginalAmount(),
                "Pago eliminado y saldo de la obligación recalculado correctamente."
        );
    }

    /**
     * Política canónica centralizada para aplicar el impacto financiero de un pago a una deuda.
     */
    private void applyPaymentImpact(Debt debt, BigDecimal amount) {
        if (debt.getCurrentBalance().compareTo(amount) < 0) {
            throw new BusinessRuleException("PAYMENT_EXCEEDS_BALANCE", "El pago no puede superar el saldo actual de la obligación.");
        }
        debt.setCurrentBalance(debt.getCurrentBalance().subtract(amount));
        debtService.updateDebtStatus(debt);
    }

    /**
     * Política canónica centralizada para revertir el impacto financiero de un pago en una deuda.
     */
    private void revertPaymentImpact(Debt debt, BigDecimal amount) {
        debt.setCurrentBalance(debt.getCurrentBalance().add(amount));
        debtService.updateDebtStatus(debt);
    }

    private Payment findEntity(UUID id) {
        return paymentRepository.findByIdAndDebtUserId(id, currentUser.id())
                .orElseThrow(() -> new ResourceNotFoundException("Pago no encontrado"));
    }

    private void validateDate(LocalDate date) {
        if (date == null) {
            throw new BusinessRuleException("PAYMENT_DATE_REQUIRED", "La fecha del pago es obligatoria.");
        }
        if (date.isAfter(LocalDate.now())) {
            throw new BusinessRuleException("FUTURE_PAYMENT_DATE", "La fecha del pago no puede ser futura.");
        }
    }

    private void validateAmountGreaterThanZero(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessRuleException("INVALID_PAYMENT_AMOUNT", "El valor del pago debe ser mayor que cero.");
        }
    }

    private void validateFullPaymentAmount(BigDecimal amount, BigDecimal currentBalance) {
        if (amount.compareTo(currentBalance) != 0) {
            throw new BusinessRuleException(
                    "FULL_PAYMENT_AMOUNT_MISMATCH",
                    "El valor del pago total debe coincidir exactamente con el saldo actual de la obligación (" + currentBalance + ")."
            );
        }
    }

    private void apply(Payment payment, PaymentRequest request) {
        payment.setType(request.type());
        payment.setAmount(request.amount());
        payment.setDate(request.date());
        payment.setNotes(request.notes());
    }

    private PaymentResponse toResponse(Payment payment) {
        Debt debt = payment.getDebt();
        return new PaymentResponse(
                payment.getId(),
                debt.getId(),
                debt.getName(),
                payment.getAmount(),
                payment.getDate(),
                payment.getType(),
                payment.getType().label(),
                "completed",
                payment.getNotes(),
                debt.getCurrentBalance(),
                debt.getStatus(),
                debt.getOriginalAmount()
        );
    }
}

