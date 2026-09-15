package com.ceroa.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record SimulationEventRequest(
        LocalDate date,
        Integer period,
        BigDecimal extraPayment,
        BigDecimal modifiedMonthlyPayment
) {
}

