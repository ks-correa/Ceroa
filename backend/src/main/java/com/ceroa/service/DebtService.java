package com.ceroa.service;

import com.ceroa.api.dto.DebtRequest;
import com.ceroa.api.dto.DebtResponse;
import com.ceroa.domain.*;
import com.ceroa.exception.BusinessRuleException;
import com.ceroa.exception.ResourceNotFoundException;
import com.ceroa.repository.DebtRepository;
import com.ceroa.repository.PaymentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class DebtService {
    private static final int CERO_DEBT_LIMIT = 2;

    private final DebtRepository debtRepository;
    private final PaymentRepository paymentRepository;
    private final CurrentUserService currentUser;

    public DebtService(DebtRepository debtRepository, PaymentRepository paymentRepository, CurrentUserService currentUser) {
        this.debtRepository = debtRepository;
        this.paymentRepository = paymentRepository;
        this.currentUser = currentUser;
    }

    @Transactional(readOnly = true)
    public List<DebtResponse> findAll() {
        List<Debt> debts = debtRepository.findAllByUserIdOrderByCreatedAtDesc(currentUser.id());
        if (debts.isEmpty()) return List.of();

        Map<UUID, Long> paymentCounts = paymentRepository
                .countByDebtIds(debts.stream().map(Debt::getId).toList())
                .stream()
                .collect(Collectors.toMap(
                        PaymentRepository.DebtPaymentCount::getDebtId,
                        PaymentRepository.DebtPaymentCount::getPaymentCount));
        return debts.stream()
                .map(debt -> toResponse(debt, paymentCounts.getOrDefault(debt.getId(), 0L)))
                .toList();
    }

    @Transactional(readOnly = true)
    public DebtResponse findById(UUID id) {
        return toResponse(findEntity(id));
    }

    @Transactional
    public DebtResponse create(DebtRequest request) {
        User user = currentUser.entityForUpdate();
        if (user.getPlan() == UserPlan.CERO && debtRepository.countByUserId(user.getId()) >= CERO_DEBT_LIMIT) {
            throw new BusinessRuleException(
                    "PLAN_CERO_DEBT_LIMIT",
                    "El plan Cero permite registrar máximo 2 deudas. Mejora a Ceroa Plus para agregar más.");
        }
        validateAmounts(request);
        Debt debt = new Debt();
        debt.setUser(user);
        apply(debt, request);
        return toResponse(debtRepository.save(debt));
    }

    @Transactional
    public DebtResponse update(UUID id, DebtRequest request) {
        validateAmounts(request);
        Debt debt = findEntity(id);
        apply(debt, request);
        return toResponse(debtRepository.save(debt));
    }

    @Transactional
    public void delete(UUID id) {
        debtRepository.delete(findEntity(id));
    }

    Debt findEntity(UUID id) {
        return debtRepository.findByIdAndUserId(id, currentUser.id())
                .orElseThrow(() -> new ResourceNotFoundException("Deuda no encontrada"));
    }

    private void validateAmounts(DebtRequest request) {
        if (request.currentBalance().compareTo(request.originalAmount()) > 0) {
            throw new BusinessRuleException("INVALID_DEBT_BALANCE", "El saldo actual no puede superar el valor original.");
        }
        if (request.rateType() == RateType.NONE && request.interestRate() != null
                && request.interestRate().compareTo(BigDecimal.ZERO) > 0) {
            throw new BusinessRuleException("INVALID_RATE", "Una deuda sin intereses debe tener tasa igual a cero.");
        }
    }

    private void apply(Debt debt, DebtRequest request) {
        debt.setName(request.name().trim());
        debt.setEntity(request.entity().trim());
        debt.setType(request.type());
        debt.setCategoryLabel(request.categoryLabel() == null || request.categoryLabel().isBlank()
                ? categoryFor(request.type()) : request.categoryLabel().trim());
        debt.setOriginalAmount(request.originalAmount());
        debt.setCurrentBalance(request.currentBalance());
        debt.setInterestRate(request.interestRate() == null ? BigDecimal.ZERO : request.interestRate());
        debt.setRateType(request.rateType());
        debt.setMonthlyPayment(request.monthlyPayment() == null ? BigDecimal.ZERO : request.monthlyPayment());
        debt.setMinimumPayment(request.minimumPayment() == null ? BigDecimal.ZERO : request.minimumPayment());
        debt.setDueDateDay(request.dueDateDay());
        debt.setNextDueDate(request.nextDueDate());
        debt.setDisbursementDate(request.disbursementDate());
        debt.setTermRemainingMonths(request.termRemainingMonths());
        debt.setAccountNumber(request.accountNumber());
        debt.setStatus(request.currentBalance().signum() == 0 ? DebtStatus.PAID
                : request.status() == null ? DebtStatus.CURRENT : request.status());
        debt.setNotes(request.notes());
        debt.setColor(request.color() == null ? "#008FA6" : request.color());
        debt.setDetails(request.details());
    }

    private String categoryFor(DebtType type) {
        return switch (type) {
            case CREDIT_CARD -> "Tarjeta de crédito";
            case PERSONAL_LOAN -> "Préstamo personal";
            case MORTGAGE -> "Crédito hipotecario";
            case AUTO_LOAN -> "Crédito de vehículo";
            case STUDENT_LOAN -> "Crédito educativo";
            case RETAIL_CREDIT -> "Crédito comercial";
            case INSTALLMENT_PURCHASE -> "Compra a cuotas";
            case OVERDUE_BILL -> "Obligación vencida";
            case FAMILY_LOAN -> "Familiar o amigo";
            case OTHER -> "Otra obligación";
        };
    }

    private DebtResponse toResponse(Debt debt) {
        return toResponse(debt, paymentRepository.countByDebtId(debt.getId()));
    }

    private DebtResponse toResponse(Debt debt, long paymentCount) {
        return new DebtResponse(
                debt.getId(), debt.getName(), debt.getEntity(), debt.getType(), debt.getCategoryLabel(),
                debt.getOriginalAmount(), debt.getCurrentBalance(), debt.getInterestRate(), debt.getRateType(),
                debt.getMonthlyPayment(), debt.getMinimumPayment(), debt.getDueDateDay(), debt.getNextDueDate(),
                debt.getDisbursementDate(), debt.getTermRemainingMonths(), debt.getAccountNumber(), debt.getStatus(),
                debt.getNotes(), debt.getColor(), debt.getDetails(), paymentCount);
    }
}
