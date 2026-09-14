package com.ceroa.api.dto;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
public record ExternalRegistrationRequest(
    @NotBlank @Size(max = 160) @Pattern(regexp = "(?sU).*\\S.*") String fullName,
    @NotBlank @Email @Size(max = 254) @Pattern(regexp = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$") String email,
    @NotBlank @Pattern(regexp = "^\\+?[0-9]{7,15}$") String phone,
    @NotNull @Past LocalDate birthDate,
    @AssertTrue boolean acceptTerms,
    @AssertTrue boolean acceptPrivacy
) {
    @Override public String toString() { return "ExternalRegistrationRequest[REDACTED]"; }
    @AssertTrue(message = "debes tener al menos 18 años")
    public boolean isAdult() { return birthDate != null && !birthDate.isAfter(LocalDate.now(java.time.ZoneId.of("America/Bogota")).minusYears(18)); }
}
