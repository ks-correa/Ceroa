package com.ceroa.api.dto;

import com.ceroa.domain.DebtStatus;
import com.ceroa.domain.DebtType;
import com.ceroa.domain.RateType;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

public record DebtRequest(
        @NotBlank @Size(max = 160) String name,
        @NotBlank @Size(max = 160) String entity,
        @NotNull DebtType type,
        @Size(max = 100) String categoryLabel,
        @NotNull @DecimalMin(value = "0.01") BigDecimal originalAmount,
        @NotNull @DecimalMin(value = "0.00") BigDecimal currentBalance,
        @DecimalMin(value = "0.00") BigDecimal interestRate,
        @NotNull RateType rateType,
        @DecimalMin(value = "0.00") BigDecimal monthlyPayment,
        @DecimalMin(value = "0.00") BigDecimal minimumPayment,
        @Min(1) @Max(31) Integer dueDateDay,
        LocalDate nextDueDate,
        LocalDate disbursementDate,
        @Min(0) Integer termRemainingMonths,
        @Size(max = 80) String accountNumber,
        DebtStatus status,
        @Size(max = 1000) String notes,
        @Pattern(regexp = "^#[0-9A-Fa-f]{6}$") String color,
        Map<String, Object> details
) {}
