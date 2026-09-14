package com.ceroa.api;

import com.ceroa.api.dto.*;
import com.ceroa.config.*;
import com.ceroa.service.*;
import com.ceroa.exception.BusinessRuleException;
import jakarta.servlet.http.*;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth/external")
public class ExternalAuthController {
    private final OAuthProviders providers;
    private final ExternalAuthService external;
    private final AuthCookieService cookies;
    public ExternalAuthController(OAuthProviders providers, ExternalAuthService external, AuthCookieService cookies) {
        this.providers = providers; this.external = external; this.cookies = cookies;
    }
    @PostMapping("/{provider}/start")
    public ResponseEntity<Map<String, String>> start(@PathVariable String provider, HttpServletRequest request) {
        if (providers.findByRegistrationId(provider) == null)
            throw new BusinessRuleException("PROVIDER_UNAVAILABLE", "El acceso con este proveedor no está disponible en este momento. Puedes usar correo y contraseña.");
        OAuthHandlers.clear(request);
        request.getSession(true).setMaxInactiveInterval(600);
        return ResponseEntity.ok().header("Set-Cookie", cookies.issue(""))
            .body(Map.of("url", "/oauth2/authorization/" + provider));
    }
    @GetMapping("/pending")
    public Map<String, String> pending(HttpServletRequest request) {
        PendingIdentity pending = identity(request);
        return Map.of("provider", pending.provider(), "email", pending.email() == null ? "" : pending.email(),
            "fullName", pending.fullName() == null ? "" : pending.fullName());
    }
    @PostMapping("/complete")
    public ResponseEntity<UserResponse> complete(@Valid @RequestBody ExternalRegistrationRequest body, HttpServletRequest request) {
        AuthResult result = external.complete(identity(request), body);
        OAuthHandlers.clear(request);
        return ResponseEntity.ok().header("Set-Cookie", cookies.issue(result.token())).body(result.user());
    }
    @PostMapping("/cancel")
    public ResponseEntity<Void> cancel(HttpServletRequest request) {
        OAuthHandlers.clear(request);
        return ResponseEntity.noContent().header("Set-Cookie", cookies.issue("")).build();
    }
    private PendingIdentity identity(HttpServletRequest request) {
        var session = request.getSession(false);
        var pending = session == null ? null : (PendingIdentity) session.getAttribute(OAuthHandlers.PENDING);
        external.requireValid(pending);
        return pending;
    }
}
