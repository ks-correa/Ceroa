package com.ceroa.api.dto;

import jakarta.validation.constraints.*;

import java.time.LocalDate;

public record RegisterRequest(
        @NotBlank @Size(max = 160) @Pattern(regexp = "(?sU).*\\S.*") String fullName,
        @NotBlank @Email @Pattern(regexp = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$") @Size(max = 254) String email,
        @NotBlank @Pattern(regexp = "^\\+?[0-9]{7,15}$", message = "ingresa entre 7 y 15 dígitos, con + opcional") String phone,
        @NotNull @Past LocalDate birthDate,
        @NotBlank
        @Pattern(
                regexp = "^(?=.*[A-Z])(?=.*[^A-Za-z0-9\\s]).{8,72}$",
                message = "debe tener entre 8 y 72 caracteres, una mayúscula y un carácter especial"
        )
        String password,
        @NotBlank String confirmPassword,
        @AssertTrue(message = "debes aceptar los términos") boolean acceptTerms,
        @AssertTrue(message = "debes aceptar la política de privacidad") boolean acceptPrivacy
) {
    @Override public String toString() { return "RegisterRequest[REDACTED]"; }
    @AssertTrue(message = "las contraseñas deben coincidir")
    public boolean isPasswordConfirmed() { return password != null && password.equals(confirmPassword); }

    @AssertTrue(message = "debes tener al menos 18 años")
    public boolean isAdult() { return birthDate != null && !birthDate.isAfter(LocalDate.now(java.time.ZoneId.of("America/Bogota")).minusYears(18)); }

    @AssertTrue(message = "la contraseña no puede superar 72 bytes")
    public boolean isPasswordWithinLimit() { return password != null && password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length <= 72; }
}
