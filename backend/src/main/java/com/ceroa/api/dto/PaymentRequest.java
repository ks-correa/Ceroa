package com.ceroa.api.dto;

import com.ceroa.domain.PaymentType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record PaymentRequest(
        @NotNull UUID debtId,
        @NotNull PaymentType type,
        @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
        @NotNull @PastOrPresent LocalDate date,
        @Size(max = 500) String notes
) {}
