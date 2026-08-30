package com.ceroa.domain;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum PaymentType {
    MINIMUM("minimum", "Pago mínimo"),
    INSTALLMENT("monthly_fee", "Pago de cuota"),
    EXTRA_PRINCIPAL("extra_principal", "Abono adicional"),
    FULL("full", "Pago total");

    private final String value;
    private final String label;

    PaymentType(String value, String label) {
        this.value = value;
        this.label = label;
    }

    @JsonValue
    public String value() {
        return value;
    }

    public String label() {
        return label;
    }

    @JsonCreator
    public static PaymentType fromValue(String value) {
        for (PaymentType type : values()) {
            if (type.value.equalsIgnoreCase(value)) return type;
        }
        throw new IllegalArgumentException("Tipo de pago no soportado: " + value);
    }
}
