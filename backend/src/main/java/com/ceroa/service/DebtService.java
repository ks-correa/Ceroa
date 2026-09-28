package com.ceroa.service;

import com.ceroa.api.dto.DebtRequest;
import com.ceroa.api.dto.DebtResponse;
import com.ceroa.domain.*;
import com.ceroa.exception.BusinessRuleException;
import com.ceroa.exception.ResourceNotFoundException;
import com.ceroa.repository.DebtRepository;
import com.ceroa.repository.PaymentRepository;
import com.ceroa.service.validation.DebtValidator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class DebtService {
    @org.springframework.beans.factory.annotation.Autowired(required = false) private MonthlyHistoryService monthlyHistory;
    @org.springframework.beans.factory.annotation.Autowired(required = false) private PlanAccessService planAccess;
    @org.springframework.beans.factory.annotation.Autowired(required = false) private com.ceroa.repository.ScheduledDeliveryRepository scheduledDeliveries;
    @org.springframework.beans.factory.annotation.Autowired(required = false) private SentinelVersionService sentinelVersions;

    private final DebtRepository debtRepository;
    private final PaymentRepository paymentRepository;
    private final CurrentUserService currentUser;
    private final DebtValidator debtValidator;
    private final com.ceroa.repository.NotificationRepository notificationRepository;

    public DebtService(
            DebtRepository debtRepository,
            PaymentRepository paymentRepository,
            CurrentUserService currentUser,
            DebtValidator debtValidator) {
        this(debtRepository, paymentRepository, currentUser, debtValidator, null);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public DebtService(
            DebtRepository debtRepository,
            PaymentRepository paymentRepository,
            CurrentUserService currentUser,
            DebtValidator debtValidator,
            com.ceroa.repository.NotificationRepository notificationRepository) {
        this.debtRepository = debtRepository;
        this.paymentRepository = paymentRepository;
        this.currentUser = currentUser;
        this.debtValidator = debtValidator;
        this.notificationRepository = notificationRepository;
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
        if (!(planAccess == null ? PlanAccessService.plusActive(user) : planAccess.entitled(user)) && debtRepository.countByUserId(user.getId()) >= PlanAccessService.CERO_DEBT_LIMIT) {
            throw new BusinessRuleException(
                    "PLAN_CERO_DEBT_LIMIT",
                    "El plan Cero permite registrar máximo 2 deudas. Mejora a Ceroa Plus para agregar más.");
        }
        debtValidator.validate(request);
        if (monthlyHistory != null) monthlyHistory.baseline(user.getId());
        Debt debt = new Debt();
        debt.setUser(user);
        apply(debt, request);
        Debt saved = debtRepository.save(debt);
        if(sentinelVersions!=null)sentinelVersions.mark(user.getId());
        if (monthlyHistory != null) monthlyHistory.observe(user.getId(), null, null, null);
        return toResponse(saved);
    }

    @Transactional
    public DebtResponse update(UUID id, DebtRequest request) {
        currentUser.entityForUpdate();
        Debt debt = findEntity(id);
        if (request.type() != null && request.type() != debt.getType()) {
            throw new BusinessRuleException("IMMUTABLE_DEBT_TYPE", "No se permite cambiar el tipo de una obligación existente.");
        }
        debtValidator.validate(request);
        if (monthlyHistory != null) monthlyHistory.baseline(currentUser.id());
        apply(debt, request);
        Debt saved = debtRepository.save(debt);
        if(sentinelVersions!=null)sentinelVersions.mark(currentUser.id());
        if (scheduledDeliveries != null) scheduledDeliveries.invalidateDebt(debt.getId());
        if (monthlyHistory != null) monthlyHistory.observe(currentUser.id(), null, null, null);
        return toResponse(saved);
    }

    @Transactional
    public void delete(UUID id) {
        currentUser.entityForUpdate();
        Debt debt = findEntity(id);
        if (scheduledDeliveries != null) scheduledDeliveries.invalidateDebt(id);
        if (monthlyHistory != null) monthlyHistory.baseline(currentUser.id());
        if (notificationRepository != null) {
            notificationRepository.detachDebtReference(debt.getId());
        }
        paymentRepository.deleteAllByDebtId(debt.getId());
        debtRepository.delete(debt);
        if(sentinelVersions!=null)sentinelVersions.mark(currentUser.id());
        if (monthlyHistory != null) monthlyHistory.observe(currentUser.id(), null, null, null);
    }

    Debt findEntity(UUID id) {
        return debtRepository.findByIdAndUserId(id, currentUser.id())
                .orElseThrow(() -> new ResourceNotFoundException("Deuda no encontrada"));
    }

    private void apply(Debt debt, DebtRequest request) {
        debt.setName(request.name().trim());
        debt.setEntity(request.entity() != null && !request.entity().trim().isBlank()
                ? request.entity().trim()
                : (request.type() == DebtType.OTHER ? "Particular / Otro" : (request.type() == DebtType.FAMILY_LOAN ? "Familiar / Amigo" : "No especificada")));
        debt.setType(request.type());
        debt.setCategoryLabel(request.categoryLabel() == null || request.categoryLabel().isBlank()
                ? categoryFor(request.type()) : request.categoryLabel().trim());

        // Manejo de originalAmount: si es tarjeta y viene en details.creditLimit
        BigDecimal originalAmount = request.originalAmount();
        Map<String, Object> details = request.details() == null ? new LinkedHashMap<>() : new LinkedHashMap<>(request.details());
        if (originalAmount == null && request.type() == DebtType.CREDIT_CARD && details.get("creditLimit") != null) {
            try {
                originalAmount = new BigDecimal(String.valueOf(details.get("creditLimit")));
            } catch (Exception ignored) {}
        }
        debt.setOriginalAmount(originalAmount);

        debt.setCurrentBalance(request.currentBalance());
        debt.setInterestRate(request.interestRate() == null || request.rateType() == RateType.NONE ? BigDecimal.ZERO : request.interestRate());
        debt.setRateType(request.rateType());
        debt.setMonthlyPayment(request.monthlyPayment() == null ? BigDecimal.ZERO : request.monthlyPayment());
        debt.setMinimumPayment(request.minimumPayment() == null ? BigDecimal.ZERO : request.minimumPayment());
        debt.setDueDateDay(request.dueDateDay());
        debt.setNextDueDate(request.nextDueDate());
        debt.setDisbursementDate(request.disbursementDate());
        debt.setTermRemainingMonths(request.termRemainingMonths());
        debt.setAccountNumber(request.accountNumber());

        // Determinar status estrictamente en backend
        debt.setStatus(calculateSystemStatus(debt.getCurrentBalance(), debt.getNextDueDate(), debt.getType(), details));

        // Señalizar capacidad de proyección para deudas familiares y otras
        if (request.type() == DebtType.FAMILY_LOAN || request.type() == DebtType.OTHER) {
            boolean hasSufficientProjection = (debt.getMonthlyPayment() != null && debt.getMonthlyPayment().compareTo(BigDecimal.ZERO) > 0)
                    || debt.getNextDueDate() != null;
            details.put("hasSufficientProjectionData", hasSufficientProjection);
        } else {
            details.put("hasSufficientProjectionData", true);
        }

        debt.setNotes(request.notes());
        debt.setColor(request.color() == null ? "#008FA6" : request.color());
        debt.setDetails(details);
    }

    public DebtStatus calculateSystemStatus(Debt debt) {
        if (debt == null) return DebtStatus.CURRENT;
        return calculateSystemStatus(
                debt.getCurrentBalance(),
                debt.getNextDueDate(),
                debt.getType(),
                debt.getDetails());
    }

    public void updateDebtStatus(Debt debt) {
        if (debt != null) {
            debt.setStatus(calculateSystemStatus(debt));
        }
    }

    private DebtStatus calculateSystemStatus(
            BigDecimal currentBalance,
            LocalDate nextDueDate,
            DebtType type,
            Map<String, Object> details) {
        if (currentBalance != null && currentBalance.compareTo(BigDecimal.ZERO) == 0) {
            return DebtStatus.PAID;
        }
        if (type == DebtType.OVERDUE_BILL) {
            return DebtStatus.OVERDUE;
        }
        if (nextDueDate != null) {
            LocalDate today = LocalDate.now();
            if (nextDueDate.isBefore(today)) {
                return DebtStatus.OVERDUE;
            }
            if (nextDueDate.isEqual(today)) {
                return DebtStatus.DUE_TODAY;
            }
            return DebtStatus.CURRENT;
        }
        return DebtStatus.CURRENT;
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
