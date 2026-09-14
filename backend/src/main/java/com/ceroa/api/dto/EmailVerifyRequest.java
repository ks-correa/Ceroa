package com.ceroa.api.dto;

import jakarta.validation.constraints.*;
import java.util.UUID;

public record EmailVerifyRequest(
    @NotNull UUID requestId,
    @NotBlank @Pattern(regexp = "[0-9]{8}", message = "El código debe ser de 8 dígitos numéricos.") String code
) {
    @Override public String toString() { return "EmailVerifyRequest[REDACTED]"; }
}
