package com.ceroa.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank @Email @jakarta.validation.constraints.Size(max = 254)
        @jakarta.validation.constraints.Pattern(regexp = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$") String email,
        @NotBlank @jakarta.validation.constraints.Size(max = 72) String password
) {
    @Override public String toString() { return "LoginRequest[REDACTED]"; }
}
