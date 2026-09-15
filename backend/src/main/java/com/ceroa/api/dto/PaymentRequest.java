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
        @NotNull(message = "La deuda relacionada es obligatoria.") UUID debtId,
        @NotNull(message = "El tipo de pago es obligatorio.") PaymentType type,
        @NotNull(message = "El valor del pago es obligatorio.") @DecimalMin(value = "0.01", message = "El valor del pago debe ser mayor que cero.") BigDecimal amount,
        @NotNull(message = "La fecha del pago es obligatoria.") @PastOrPresent(message = "La fecha del pago no puede ser futura.") LocalDate date,
        @Size(max = 500, message = "La nota no puede superar los 500 caracteres.") String notes
) {}

