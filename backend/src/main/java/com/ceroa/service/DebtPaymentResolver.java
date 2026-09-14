package com.ceroa.service;

import com.ceroa.domain.Debt;
import com.ceroa.domain.DebtType;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Map;

@Component
public class DebtPaymentResolver {

    public BigDecimal resolveExigiblePayment(Debt debt) {
        if (debt == null) return null;
        DebtType type = debt.getType();
        Map<String, Object> details = debt.getDetails() != null ? debt.getDetails() : Map.of();

        switch (type) {
            case CREDIT_CARD -> {
                if (debt.getMinimumPayment() != null && debt.getMinimumPayment().compareTo(BigDecimal.ZERO) > 0) {
                    return debt.getMinimumPayment();
                }
                if (debt.getMonthlyPayment() != null && debt.getMonthlyPayment().compareTo(BigDecimal.ZERO) > 0) {
                    return debt.getMonthlyPayment();
                }
                return null;
            }
            case PERSONAL_LOAN, MORTGAGE, AUTO_LOAN, RETAIL_CREDIT, INSTALLMENT_PURCHASE -> {
                if (debt.getMonthlyPayment() != null && debt.getMonthlyPayment().compareTo(BigDecimal.ZERO) > 0) {
                    return debt.getMonthlyPayment();
                }
                BigDecimal detailPayment = extractPositiveDecimal(details.get("installmentAmount"));
                if (detailPayment == null) detailPayment = extractPositiveDecimal(details.get("monthlyPayment"));
                if (detailPayment != null && detailPayment.compareTo(BigDecimal.ZERO) > 0) {
                    return detailPayment;
                }
                return null;
            }
            case STUDENT_LOAN -> {
                String stage = String.valueOf(details.getOrDefault("stage", "")).toUpperCase();
                boolean hasObligation = Boolean.TRUE.equals(details.get("hasPaymentObligation"))
                        || Boolean.TRUE.equals(details.get("paymentExigible"))
                        || "AMORTIZACION".equals(stage)
                        || (debt.getMonthlyPayment() != null && debt.getMonthlyPayment().compareTo(BigDecimal.ZERO) > 0);
                if (hasObligation) {
                    if (debt.getMonthlyPayment() != null && debt.getMonthlyPayment().compareTo(BigDecimal.ZERO) > 0) {
                        return debt.getMonthlyPayment();
                    }
                    return null;
                }
                return BigDecimal.ZERO;
            }
            case OVERDUE_BILL -> {
                if (debt.getMonthlyPayment() != null && debt.getMonthlyPayment().compareTo(BigDecimal.ZERO) > 0) {
                    return debt.getMonthlyPayment();
                }
                BigDecimal agreed = extractPositiveDecimal(details.get("agreedPayment"));
                if (agreed == null) agreed = extractPositiveDecimal(details.get("paymentAgreement"));
                if (agreed == null) agreed = extractPositiveDecimal(details.get("settlementAmount"));
                if (agreed != null && agreed.compareTo(BigDecimal.ZERO) > 0) {
                    return agreed;
                }
                if (debt.getCurrentBalance() != null && debt.getCurrentBalance().compareTo(BigDecimal.ZERO) > 0) {
                    return debt.getCurrentBalance();
                }
                return null;
            }
            case FAMILY_LOAN, OTHER -> {
                if (debt.getMonthlyPayment() != null && debt.getMonthlyPayment().compareTo(BigDecimal.ZERO) > 0) {
                    return debt.getMonthlyPayment();
                }
                BigDecimal agreed = extractPositiveDecimal(details.get("agreedPayment"));
                if (agreed == null) agreed = extractPositiveDecimal(details.get("monthlyPayment"));
                if (agreed == null) agreed = extractPositiveDecimal(details.get("paymentAgreement"));
                if (agreed != null && agreed.compareTo(BigDecimal.ZERO) > 0) {
                    return agreed;
                }
                return null;
            }
        }
        return null;
    }

    public BigDecimal extractPositiveDecimal(Object value) {
        if (value == null) return null;
        if (value instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        try {
            BigDecimal bd = new BigDecimal(String.valueOf(value));
            return bd.compareTo(BigDecimal.ZERO) >= 0 ? bd : null;
        } catch (Exception e) {
            return null;
        }
    }
}

