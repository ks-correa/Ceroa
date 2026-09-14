package com.ceroa.api.dto;

import com.ceroa.domain.DebtType;
import com.ceroa.domain.RateType;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

public record DebtRequest(
        @NotBlank(message = "El nombre personalizado es obligatorio.") @Size(max = 160) String name,
        @Size(max = 160) String entity,
        @NotNull(message = "El tipo de deuda es obligatorio.") DebtType type,
        @Size(max = 100) String categoryLabel,
        @DecimalMin(value = "0.01", message = "El monto inicial debe ser mayor a 0.") BigDecimal originalAmount,
        @NotNull(message = "El saldo actual es obligatorio.") @DecimalMin(value = "0.00", message = "El saldo actual no puede ser negativo.") BigDecimal currentBalance,
        @DecimalMin(value = "0.00", message = "La tasa de interés no puede ser negativa.") BigDecimal interestRate,
        @NotNull(message = "El tipo de tasa es obligatorio.") RateType rateType,
        @DecimalMin(value = "0.00", message = "El valor de cuota no puede ser negativo.") BigDecimal monthlyPayment,
        @DecimalMin(value = "0.00", message = "El pago mínimo no puede ser negativo.") BigDecimal minimumPayment,
        @Min(1) @Max(31) Integer dueDateDay,
        LocalDate nextDueDate,
        LocalDate disbursementDate,
        @Min(0) Integer termRemainingMonths,
        @Size(max = 80) String accountNumber,
        @Size(max = 1000) String notes,
        @Pattern(regexp = "^#[0-9A-Fa-f]{6}$") String color,
        Map<String, Object> details
) {}
