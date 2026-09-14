package com.ceroa.api.dto;

import jakarta.validation.constraints.*;
import java.time.LocalDate;

public record UserUpdateRequest(
        @NotBlank @Size(max = 160) String fullName,
        @Size(max = 30)
        @Pattern(regexp = "^(\\+?[0-9]{7,15})?$", message = "Ingresa entre 7 y 15 dígitos, con + opcional.")
        String phone,
        @Size(max = 50) String documentId,
        LocalDate birthDate
) {}
