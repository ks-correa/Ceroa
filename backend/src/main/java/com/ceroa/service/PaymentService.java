package com.ceroa.service;

import com.ceroa.api.dto.PaymentRequest;
import com.ceroa.api.dto.PaymentResponse;
import com.ceroa.domain.Debt;
import com.ceroa.domain.DebtStatus;
import com.ceroa.domain.Payment;
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
        List<Payment> payments = debtId == null
                ? paymentRepository.findAllByDebtUserIdOrderByDateDescCreatedAtDesc(currentUser.id())
                : paymentRepository.findAllByDebtIdAndDebtUserIdOrderByDateDescCreatedAtDesc(debtId, currentUser.id());
        return payments.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public PaymentResponse findById(UUID id) {
        return toResponse(findEntity(id));
    }

    @Transactional
    public PaymentResponse create(PaymentRequest request) {
        validateDate(request.date());
        Debt debt = debtService.findEntity(request.debtId());
        validateAmount(request.amount(), debt.getCurrentBalance());

        Payment payment = new Payment();
        payment.setDebt(debt);
        apply(payment, request);
        debt.setCurrentBalance(debt.getCurrentBalance().subtract(request.amount()));
        updateDebtStatus(debt);
        debtRepository.save(debt);
        return toResponse(paymentRepository.save(payment));
    }

    @Transactional
    public PaymentResponse update(UUID id, PaymentRequest request) {
        validateDate(request.date());
        Payment payment = findEntity(id);
        Debt originalDebt = payment.getDebt();
        Debt targetDebt = debtService.findEntity(request.debtId());

        BigDecimal originalRestoredBalance = originalDebt.getCurrentBalance().add(payment.getAmount())
                .min(originalDebt.getOriginalAmount());
        if (originalDebt.getId().equals(targetDebt.getId())) {
            validateAmount(request.amount(), originalRestoredBalance);
            targetDebt.setCurrentBalance(originalRestoredBalance.subtract(request.amount()));
        } else {
            validateAmount(request.amount(), targetDebt.getCurrentBalance());
            originalDebt.setCurrentBalance(originalRestoredBalance);
            targetDebt.setCurrentBalance(targetDebt.getCurrentBalance().subtract(request.amount()));
            updateDebtStatus(originalDebt);
            debtRepository.save(originalDebt);
        }

        payment.setDebt(targetDebt);
        apply(payment, request);
        updateDebtStatus(targetDebt);
        debtRepository.save(targetDebt);
        return toResponse(paymentRepository.save(payment));
    }

    @Transactional
    public void delete(UUID id) {
        Payment payment = findEntity(id);
        Debt debt = payment.getDebt();
        debt.setCurrentBalance(debt.getCurrentBalance().add(payment.getAmount()).min(debt.getOriginalAmount()));
        updateDebtStatus(debt);
        paymentRepository.delete(payment);
        debtRepository.save(debt);
    }

    private Payment findEntity(UUID id) {
        return paymentRepository.findByIdAndDebtUserId(id, currentUser.id())
                .orElseThrow(() -> new ResourceNotFoundException("Pago no encontrado"));
    }

    private void validateDate(LocalDate date) {
        if (date.isAfter(LocalDate.now())) {
            throw new BusinessRuleException("FUTURE_PAYMENT_DATE", "La fecha del pago no puede ser futura.");
        }
    }

    private void validateAmount(BigDecimal amount, BigDecimal balance) {
        if (amount.compareTo(balance) > 0) {
            throw new BusinessRuleException("PAYMENT_EXCEEDS_BALANCE", "El pago no puede superar el saldo actual.");
        }
    }

    private void apply(Payment payment, PaymentRequest request) {
        payment.setType(request.type());
        payment.setAmount(request.amount());
        payment.setDate(request.date());
        payment.setNotes(request.notes());
    }

    private void updateDebtStatus(Debt debt) {
        debt.setStatus(debt.getCurrentBalance().signum() == 0 ? DebtStatus.PAID : DebtStatus.CURRENT);
    }

    private PaymentResponse toResponse(Payment payment) {
        return new PaymentResponse(
                payment.getId(), payment.getDebt().getId(), payment.getDebt().getName(), payment.getAmount(),
                payment.getDate(), payment.getType(), payment.getType().label(), "completed", payment.getNotes());
    }
}
