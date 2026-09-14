package com.ceroa.service.validation;

import com.ceroa.api.dto.DebtRequest;
import com.ceroa.domain.DebtType;
import com.ceroa.domain.RateType;
import com.ceroa.exception.BusinessRuleException;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Map;

@Component
public class DebtValidator {

    public void validate(DebtRequest request) {
        if (request == null) {
            throw new BusinessRuleException("INVALID_REQUEST", "La solicitud no puede ser nula.");
        }
        if (request.type() == null) {
            throw new BusinessRuleException("INVALID_DEBT_TYPE", "El tipo de deuda es obligatorio.");
        }
        if (request.name() == null || request.name().trim().isBlank()) {
            throw new BusinessRuleException("INVALID_NAME", "El nombre personalizado es obligatorio.");
        }

        validateBaseBalance(request);
        validateRate(request);

        switch (request.type()) {
            case CREDIT_CARD -> validateCreditCard(request);
            case PERSONAL_LOAN -> validatePersonalLoan(request);
            case MORTGAGE -> validateMortgage(request);
            case AUTO_LOAN -> validateAutoLoan(request);
            case STUDENT_LOAN -> validateStudentLoan(request);
            case RETAIL_CREDIT -> validateRetailCredit(request);
            case INSTALLMENT_PURCHASE -> validateInstallmentPurchase(request);
            case OVERDUE_BILL -> validateOverdueBill(request);
            case FAMILY_LOAN -> validateFamilyLoan(request);
            case OTHER -> validateOther(request);
        }
    }

    private void validateBaseBalance(DebtRequest request) {
        if (request.currentBalance() == null) {
            throw new BusinessRuleException("INVALID_BALANCE", "El saldo actual es obligatorio.");
        }
        if (request.type() == DebtType.CREDIT_CARD) {
            if (request.currentBalance().compareTo(BigDecimal.ZERO) < 0) {
                throw new BusinessRuleException("INVALID_BALANCE", "El saldo de la tarjeta no puede ser negativo.");
            }
        } else {
            if (request.currentBalance().compareTo(BigDecimal.ZERO) <= 0) {
                throw new BusinessRuleException("INVALID_BALANCE", "El saldo actual debe ser mayor a cero.");
            }
        }
    }

    private void validateRate(DebtRequest request) {
        if (request.rateType() == null) {
            throw new BusinessRuleException("INVALID_RATE_TYPE", "El tipo de tasa es obligatorio.");
        }

        // Si es crédito comercial o compra a cuotas con costo fijo/tarifa, rateType debe ser NONE
        Map<String, Object> details = request.details() == null ? Map.of() : request.details();
        boolean hasFixedCost = "FEE".equalsIgnoreCase(String.valueOf(details.get("costType")))
                || "FIXED_FEE".equalsIgnoreCase(String.valueOf(details.get("costType")))
                || details.get("financialCost") != null
                || details.get("fixedFee") != null;

        if (request.rateType() == RateType.NONE) {
            if (request.interestRate() != null && request.interestRate().compareTo(BigDecimal.ZERO) > 0) {
                throw new BusinessRuleException("INVALID_RATE", "Una deuda sin intereses debe tener tasa igual a cero.");
            }
        } else if (!hasFixedCost) {
            if (request.interestRate() == null || request.interestRate().compareTo(BigDecimal.ZERO) <= 0) {
                // Si es indexada con margen, verificar que tenga margen o tasa
                BigDecimal margin = extractPositiveDecimal(details.get("interestMargin"));
                if (margin == null && (request.interestRate() == null || request.interestRate().compareTo(BigDecimal.ZERO) <= 0)) {
                    throw new BusinessRuleException("INVALID_RATE", "Debes ingresar un valor de tasa o margen mayor a cero.");
                }
            }
        }
    }

    private void validateCreditCard(DebtRequest request) {
        requireEntity(request, "Tarjeta de crédito");

        BigDecimal creditLimit = request.originalAmount();
        Map<String, Object> details = request.details() == null ? Map.of() : request.details();
        if (creditLimit == null && details.get("creditLimit") != null) {
            creditLimit = extractPositiveDecimal(details.get("creditLimit"));
        }
        if (creditLimit == null || creditLimit.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessRuleException("INVALID_CREDIT_LIMIT", "El cupo total de la tarjeta es obligatorio y debe ser mayor a cero.");
        }

        if (request.minimumPayment() == null || request.minimumPayment().compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessRuleException("INVALID_MINIMUM_PAYMENT", "El pago mínimo es obligatorio y no puede ser negativo.");
        }

        // Fecha de corte y fecha límite son obligatorios y conceptualmente separados (sin obligar corte != limite)
        boolean hasStatementDate = details.get("statementDate") != null
                || details.get("statementDay") != null
                || request.dueDateDay() != null;
        if (!hasStatementDate) {
            throw new BusinessRuleException("MISSING_STATEMENT_DATE", "La fecha o día de corte es obligatorio.");
        }

        if (request.nextDueDate() == null && details.get("paymentDueDate") == null) {
            throw new BusinessRuleException("MISSING_DUE_DATE", "La fecha límite de pago es obligatoria.");
        }

        // Relaciones de cupo disponible / utilizado
        BigDecimal availableCredit = extractPositiveDecimal(details.get("availableCredit"));
        if (availableCredit != null && availableCredit.compareTo(creditLimit) > 0) {
            throw new BusinessRuleException("INVALID_AVAILABLE_CREDIT", "El cupo disponible no puede superar el cupo total.");
        }

        BigDecimal usedCredit = extractPositiveDecimal(details.get("usedCredit"));
        if (usedCredit != null && usedCredit.compareTo(creditLimit) > 0) {
            throw new BusinessRuleException("INVALID_USED_CREDIT", "El cupo utilizado no puede superar el cupo total.");
        }
    }

    private void validatePersonalLoan(DebtRequest request) {
        requireEntity(request, "Préstamo personal");

        if (request.originalAmount() == null || request.originalAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessRuleException("INVALID_ORIGINAL_AMOUNT", "El valor inicial desembolsado es obligatorio y debe ser mayor a cero.");
        }
        // Restricción específica de préstamo personal: saldo <= valor inicial
        if (request.currentBalance().compareTo(request.originalAmount()) > 0) {
            throw new BusinessRuleException("INVALID_DEBT_BALANCE", "El saldo actual no puede superar el valor inicial desembolsado.");
        }
        if (request.monthlyPayment() == null || request.monthlyPayment().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessRuleException("INVALID_MONTHLY_PAYMENT", "La cuota vigente es obligatoria y debe ser mayor a cero.");
        }
        if (request.termRemainingMonths() == null || request.termRemainingMonths() <= 0) {
            Map<String, Object> details = request.details() == null ? Map.of() : request.details();
            Integer totalInstallments = extractPositiveInteger(details.get("totalInstallments"));
            if (totalInstallments == null) {
                throw new BusinessRuleException("INVALID_INSTALLMENTS", "El número de cuotas o plazo debe ser un entero positivo.");
            }
        }
        if (request.disbursementDate() == null) {
            throw new BusinessRuleException("MISSING_DISBURSEMENT_DATE", "La fecha de desembolso es obligatoria.");
        }
        if (request.nextDueDate() == null) {
            throw new BusinessRuleException("MISSING_DUE_DATE", "El próximo vencimiento es obligatorio.");
        }
    }

    private void validateMortgage(DebtRequest request) {
        requireEntity(request, "Crédito hipotecario");

        if (request.originalAmount() == null || request.originalAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessRuleException("INVALID_ORIGINAL_AMOUNT", "El valor financiado inicial es obligatorio y debe ser mayor a cero.");
        }
        if (request.monthlyPayment() == null || request.monthlyPayment().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessRuleException("INVALID_MONTHLY_PAYMENT", "La cuota actual es obligatoria y debe ser mayor a cero.");
        }

        Map<String, Object> details = request.details() == null ? Map.of() : request.details();
        String modality = String.valueOf(details.getOrDefault("modality", "")).toUpperCase();
        if (!"PESOS".equals(modality) && !"UVR".equals(modality)) {
            throw new BusinessRuleException("INVALID_MODALITY", "La modalidad es obligatoria y debe ser Pesos o UVR.");
        }

        if (request.nextDueDate() == null) {
            throw new BusinessRuleException("MISSING_DUE_DATE", "La fecha del próximo pago es obligatoria.");
        }
    }

    private void validateAutoLoan(DebtRequest request) {
        requireEntity(request, "Crédito de vehículo");

        if (request.originalAmount() == null || request.originalAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessRuleException("INVALID_ORIGINAL_AMOUNT", "El valor financiado inicial es obligatorio y debe ser mayor a cero.");
        }
        if (request.monthlyPayment() == null || request.monthlyPayment().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessRuleException("INVALID_MONTHLY_PAYMENT", "La cuota vigente es obligatoria y debe ser mayor a cero.");
        }
        if (request.nextDueDate() == null) {
            throw new BusinessRuleException("MISSING_DUE_DATE", "El próximo vencimiento es obligatorio.");
        }

        Map<String, Object> details = request.details() == null ? Map.of() : request.details();
        if (details.get("residualValue") != null) {
            BigDecimal residual = extractDecimal(details.get("residualValue"));
            if (residual != null && residual.compareTo(BigDecimal.ZERO) < 0) {
                throw new BusinessRuleException("INVALID_RESIDUAL_VALUE", "El valor residual no puede ser negativo.");
            }
        }
    }

    private void validateStudentLoan(DebtRequest request) {
        requireEntity(request, "Crédito educativo");

        if (request.originalAmount() == null || request.originalAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessRuleException("INVALID_ORIGINAL_AMOUNT", "El valor financiado es obligatorio y debe ser mayor a cero.");
        }

        Map<String, Object> details = request.details() == null ? Map.of() : request.details();
        String stage = String.valueOf(details.getOrDefault("stage", "")).toUpperCase();
        if (!"ESTUDIO".equals(stage) && !"GRACIA".equals(stage) && !"AMORTIZACION".equals(stage)) {
            throw new BusinessRuleException("INVALID_STAGE", "La etapa es obligatoria y debe ser Estudio, Gracia o Amortización.");
        }

        // Pago exigible condicional validado por backend
        boolean isPaymentExigible = Boolean.TRUE.equals(details.get("hasPaymentObligation"))
                || Boolean.TRUE.equals(details.get("paymentExigible"))
                || "AMORTIZACION".equals(stage)
                || (request.monthlyPayment() != null && request.monthlyPayment().compareTo(BigDecimal.ZERO) > 0);

        if (isPaymentExigible) {
            if (request.monthlyPayment() == null || request.monthlyPayment().compareTo(BigDecimal.ZERO) <= 0) {
                throw new BusinessRuleException("INVALID_MONTHLY_PAYMENT", "Para etapas con cobro periódico, la cuota es obligatoria y debe ser mayor a cero.");
            }
            if (request.nextDueDate() == null) {
                throw new BusinessRuleException("MISSING_DUE_DATE", "El próximo vencimiento es obligatorio para etapas con pago exigible.");
            }
        }
    }

    private void validateRetailCredit(DebtRequest request) {
        requireEntity(request, "Crédito comercial");

        if (request.originalAmount() == null || request.originalAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessRuleException("INVALID_ORIGINAL_AMOUNT", "El valor original es obligatorio y debe ser mayor a cero.");
        }
        if (request.monthlyPayment() == null || request.monthlyPayment().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessRuleException("INVALID_MONTHLY_PAYMENT", "El valor de cuota es obligatorio y debe ser mayor a cero.");
        }

        Map<String, Object> details = request.details() == null ? Map.of() : request.details();
        String costType = String.valueOf(details.getOrDefault("costType", "RATE")).toUpperCase();
        if ("FEE".equals(costType) || "FINANCIAL_COST".equals(costType) || details.get("financialCost") != null) {
            BigDecimal cost = extractPositiveDecimal(details.get("financialCost"));
            if (cost == null || cost.compareTo(BigDecimal.ZERO) <= 0) {
                throw new BusinessRuleException("INVALID_FINANCIAL_COST", "El costo financiero fijo debe ser mayor a cero.");
            }
        }

        Integer totalInstallments = extractPositiveInteger(details.get("totalInstallments"));
        if (totalInstallments == null || totalInstallments <= 0) {
            throw new BusinessRuleException("INVALID_INSTALLMENTS", "El total de cuotas es obligatorio y debe ser un entero positivo.");
        }
        if (request.termRemainingMonths() == null || request.termRemainingMonths() <= 0) {
            throw new BusinessRuleException("INVALID_REMAINING_INSTALLMENTS", "Las cuotas pendientes deben ser un entero positivo.");
        }
        if (request.nextDueDate() == null) {
            throw new BusinessRuleException("MISSING_DUE_DATE", "El próximo vencimiento es obligatorio.");
        }
    }

    private void validateInstallmentPurchase(DebtRequest request) {
        requireEntity(request, "Compra a cuotas");

        if (request.originalAmount() == null || request.originalAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessRuleException("INVALID_ORIGINAL_AMOUNT", "El monto inicial es obligatorio y debe ser mayor a cero.");
        }
        if (request.monthlyPayment() == null || request.monthlyPayment().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessRuleException("INVALID_MONTHLY_PAYMENT", "El valor de cuota es obligatorio y debe ser mayor a cero.");
        }

        Map<String, Object> details = request.details() == null ? Map.of() : request.details();
        String costType = String.valueOf(details.getOrDefault("costType", "RATE")).toUpperCase();
        if ("FIXED_FEE".equals(costType) || details.get("fixedFee") != null) {
            BigDecimal fee = extractPositiveDecimal(details.get("fixedFee"));
            if (fee == null || fee.compareTo(BigDecimal.ZERO) <= 0) {
                throw new BusinessRuleException("INVALID_FIXED_FEE", "La tarifa fija monetaria debe ser mayor a cero.");
            }
        }

        Integer totalInstallments = extractPositiveInteger(details.get("totalInstallments"));
        if (totalInstallments == null || totalInstallments <= 0) {
            throw new BusinessRuleException("INVALID_INSTALLMENTS", "El total de cuotas es obligatorio y debe ser un entero positivo.");
        }
        if (request.termRemainingMonths() == null || request.termRemainingMonths() <= 0) {
            throw new BusinessRuleException("INVALID_REMAINING_INSTALLMENTS", "Las cuotas pendientes deben ser un entero positivo.");
        }
        if (request.nextDueDate() == null) {
            throw new BusinessRuleException("MISSING_DUE_DATE", "El próximo vencimiento es obligatorio.");
        }
    }

    private void validateOverdueBill(DebtRequest request) {
        requireEntity(request, "Factura u obligación vencida");

        if (request.originalAmount() == null || request.originalAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessRuleException("INVALID_ORIGINAL_AMOUNT", "El valor original de la factura es obligatorio y debe ser mayor a cero.");
        }

        Map<String, Object> details = request.details() == null ? Map.of() : request.details();
        if (details.get("originalDueDate") == null && request.disbursementDate() == null) {
            throw new BusinessRuleException("MISSING_ORIGINAL_DUE_DATE", "La fecha original de vencimiento es obligatoria.");
        }

        // Tasa de mora opcional: si existe tasa, exigir tipo
        BigDecimal penaltyRate = extractPositiveDecimal(details.get("penaltyRate"));
        if (penaltyRate != null && penaltyRate.compareTo(BigDecimal.ZERO) > 0) {
            String penaltyRateType = String.valueOf(details.getOrDefault("penaltyRateType", ""));
            if (penaltyRateType.isBlank() || "null".equalsIgnoreCase(penaltyRateType)) {
                throw new BusinessRuleException("MISSING_PENALTY_RATE_TYPE", "Si se especifica tasa de mora, el tipo de tasa es obligatorio.");
            }
        }
    }

    private void validateFamilyLoan(DebtRequest request) {
        // En deuda con familiar o amigo, entity es el nombre del acreedor y es opcional según regla del usuario
        if (request.originalAmount() != null && request.originalAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessRuleException("INVALID_ORIGINAL_AMOUNT", "Si se ingresa valor inicial, debe ser mayor a cero.");
        }
    }

    private void validateOther(DebtRequest request) {
        // En otra obligación, campos bancarios no aplican y originalAmount es opcional
        if (request.originalAmount() != null && request.originalAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessRuleException("INVALID_ORIGINAL_AMOUNT", "Si se ingresa valor inicial, debe ser mayor a cero.");
        }
    }

    private void requireEntity(DebtRequest request, String debtTypeName) {
        if (request.entity() == null || request.entity().trim().isBlank()) {
            throw new BusinessRuleException("MISSING_ENTITY", "La entidad o acreedor es obligatorio para " + debtTypeName + ".");
        }
    }

    private BigDecimal extractPositiveDecimal(Object value) {
        BigDecimal dec = extractDecimal(value);
        return dec != null && dec.compareTo(BigDecimal.ZERO) >= 0 ? dec : null;
    }

    private BigDecimal extractDecimal(Object value) {
        if (value == null) return null;
        if (value instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        try {
            return new BigDecimal(String.valueOf(value));
        } catch (Exception e) {
            return null;
        }
    }

    private Integer extractPositiveInteger(Object value) {
        if (value == null) return null;
        if (value instanceof Number n) return n.intValue();
        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (Exception e) {
            return null;
        }
    }
}

