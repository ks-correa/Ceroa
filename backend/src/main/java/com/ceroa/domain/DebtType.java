package com.ceroa.domain;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum DebtType {
    CREDIT_CARD("credit_card"),
    PERSONAL_LOAN("personal_loan"),
    MORTGAGE("mortgage"),
    AUTO_LOAN("auto_loan"),
    STUDENT_LOAN("student_loan"),
    RETAIL_CREDIT("retail_credit"),
    INSTALLMENT_PURCHASE("installment_purchase"),
    OVERDUE_BILL("overdue_bill"),
    FAMILY_LOAN("family_loan"),
    OTHER("other");

    private final String value;

    DebtType(String value) {
        this.value = value;
    }

    @JsonValue
    public String value() {
        return value;
    }

    @JsonCreator
    public static DebtType fromValue(String value) {
        for (DebtType type : values()) {
            if (type.value.equalsIgnoreCase(value)) return type;
        }
        throw new IllegalArgumentException("Tipo de deuda no soportado: " + value);
    }
}
