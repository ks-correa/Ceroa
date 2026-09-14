package com.ceroa.api.dto;

import jakarta.validation.constraints.*;

public record EmailChangeRequest(
    @NotBlank @Email @Size(max = 254)
    @Pattern(regexp = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$", message = "Ingresa un correo válido, sin espacios.")
    String newEmail
) {
    @Override public String toString() { return "EmailChangeRequest[REDACTED]"; }
}
