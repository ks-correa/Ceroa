package com.ceroa.domain;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum DebtStatus {
    CURRENT("al_dia"),
    DUE_TODAY("vence_hoy"),
    OVERDUE("en_mora"),
    PAID("pagada");

    private final String value;

    DebtStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String value() {
        return value;
    }

    @JsonCreator
    public static DebtStatus fromValue(String value) {
        for (DebtStatus status : values()) {
            if (status.value.equalsIgnoreCase(value)) return status;
        }
        throw new IllegalArgumentException("Estado de deuda no soportado: " + value);
    }
}
