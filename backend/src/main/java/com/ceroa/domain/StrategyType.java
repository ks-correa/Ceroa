package com.ceroa.domain;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum StrategyType {
    SNOWBALL("snowball"),
    AVALANCHE("avalanche");

    private final String value;

    StrategyType(String value) {
        this.value = value;
    }

    @JsonValue
    public String value() {
        return value;
    }

    @JsonCreator
    public static StrategyType fromValue(String value) {
        for (StrategyType type : values()) {
            if (type.value.equalsIgnoreCase(value)) return type;
        }
        throw new IllegalArgumentException("Estrategia no soportada: " + value);
    }
}
