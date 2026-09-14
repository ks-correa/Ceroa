package com.ceroa.api;

import com.ceroa.service.PasswordRecoveryService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.time.Duration;
import java.util.*;

@RestController
@RequestMapping("/api/v1/auth/recovery")
public class RecoveryController {
    public static final String COOKIE = "ceroa_recovery";
    private final PasswordRecoveryService service;
    private final boolean secure;
    public RecoveryController(PasswordRecoveryService service, @Value("${ceroa.session.secure-cookie:false}") boolean secure) {
        this.service = service; this.secure = secure;
    }
    public record Request(@NotBlank @Email @Size(max=254)
            @Pattern(regexp="^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$") String email) {
        @Override public String toString() { return "RecoveryRequest[REDACTED]"; }
    }
    public record Verification(@NotNull UUID requestId, @NotBlank @Pattern(regexp="[0-9]{8}") String code) {
        @Override public String toString() { return "RecoveryVerification[REDACTED]"; }
    }
    public record Reset(@NotNull UUID requestId,
            @NotBlank @Pattern(regexp="^(?=.*[A-Z])(?=.*[^A-Za-z0-9\\s]).{8,72}$") String password,
            @NotBlank @Size(max=72) String confirmPassword) {
        @AssertTrue public boolean isPasswordConfirmed() { return password != null && password.equals(confirmPassword); }
        @AssertTrue public boolean isPasswordWithinLimit() {
            return password != null && password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length <= 72;
        }
        @Override public String toString() { return "RecoveryReset[REDACTED]"; }
    }
    @PostMapping("/request")
    public ResponseEntity<Map<String, Object>> request(@Valid @RequestBody Request body, jakarta.servlet.http.HttpServletRequest request) {
        UUID id = service.request(body.email(), request.getRemoteAddr());
        return ResponseEntity.accepted().body(Map.of("requestId", id,
            "message", "Solicitud aceptada. Si el correo corresponde a una cuenta activa, recibirás un código. Revisa también la carpeta de spam."));
    }
    @PostMapping("/verify")
    public ResponseEntity<Void> verify(@Valid @RequestBody Verification body) {
        String grant = service.verify(body.requestId(), body.code());
        return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, cookie(grant, Duration.ofMinutes(5))).build();
    }
    @PostMapping("/reset")
    public ResponseEntity<Void> reset(@Valid @RequestBody Reset body, @CookieValue(name=COOKIE, required=false) String grant) {
        service.reset(body.requestId(), grant, body.password());
        return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, cookie("", Duration.ZERO)).build();
    }
    private String cookie(String value, Duration age) {
        return ResponseCookie.from(COOKIE, value).httpOnly(true).secure(secure).sameSite("Strict")
            .path("/api/v1/auth/recovery").maxAge(age).build().toString();
    }
}
