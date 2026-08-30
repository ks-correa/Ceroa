package com.ceroa.domain;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum RateType {
    EA("EA"),
    MV("MV"),
    NAMV("NAMV"),
    INDEXED("INDEXED"),
    IBR_MARGIN("IBR_MARGIN"),
    IPC_MARGIN("IPC_MARGIN"),
    UVR_MARGIN("UVR_MARGIN"),
    NONE("NONE");

    private final String value;

    RateType(String value) {
        this.value = value;
    }

    @JsonValue
    public String value() {
        return value;
    }

    @JsonCreator
    public static RateType fromValue(String value) {
        for (RateType type : values()) {
            if (type.value.equalsIgnoreCase(value)) return type;
        }
        throw new IllegalArgumentException("Tipo de tasa no soportado: " + value);
    }
}
