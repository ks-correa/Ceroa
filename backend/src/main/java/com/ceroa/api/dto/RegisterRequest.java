package com.ceroa.api.dto;

import jakarta.validation.constraints.*;

import java.time.LocalDate;

public record RegisterRequest(
        @NotBlank @Size(max = 160) String fullName,
        @NotBlank @Email @Size(max = 254) String email,
        @Size(max = 30) String phone,
        @Past LocalDate birthDate,
        @NotBlank
        @Pattern(
                regexp = "^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,72}$",
                message = "debe tener entre 8 y 72 caracteres, una mayúscula y un carácter especial"
        )
        String password,
        @AssertTrue(message = "debes aceptar los términos") boolean acceptTerms,
        @AssertTrue(message = "debes aceptar la política de privacidad") boolean acceptPrivacy
) {}
