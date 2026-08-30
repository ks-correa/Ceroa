package com.ceroa.api;

import com.ceroa.api.dto.LoginRequest;
import com.ceroa.api.dto.RegisterRequest;
import com.ceroa.api.dto.UserResponse;
import com.ceroa.config.SessionAuthenticationFilter;
import com.ceroa.service.AuthResult;
import com.ceroa.service.AuthService;
import com.ceroa.service.CurrentUserService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.web.csrf.CsrfToken;

import java.time.Duration;
import java.util.Arrays;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final AuthService authService;
    private final CurrentUserService currentUser;
    private final boolean secureCookie;
    private final long sessionDays;

    public AuthController(
            AuthService authService,
            CurrentUserService currentUser,
            @Value("${ceroa.session.secure-cookie:false}") boolean secureCookie,
            @Value("${ceroa.session.days:30}") long sessionDays) {
        this.authService = authService;
        this.currentUser = currentUser;
        this.secureCookie = secureCookie;
        this.sessionDays = sessionDays;
    }

    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(@Valid @RequestBody RegisterRequest request) {
        return authenticated(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<UserResponse> login(@Valid @RequestBody LoginRequest request) {
        return authenticated(authService.login(request));
    }

    @GetMapping("/csrf")
    public Map<String, String> csrf(CsrfToken csrfToken) {
        return Map.of("token", csrfToken.getToken());
    }

    @GetMapping("/me")
    public UserResponse me() {
        return authService.toResponse(currentUser.entity());
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        authService.logout(readToken(request));
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, cookie("", Duration.ZERO).toString())
                .build();
    }

    private ResponseEntity<UserResponse> authenticated(AuthResult result) {
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie(result.token(), Duration.ofDays(sessionDays)).toString())
                .body(result.user());
    }

    private ResponseCookie cookie(String value, Duration maxAge) {
        return ResponseCookie.from(SessionAuthenticationFilter.COOKIE_NAME, value)
                .httpOnly(true)
                .secure(secureCookie)
                .sameSite("Lax")
                .path("/")
                .maxAge(maxAge)
                .build();
    }

    private String readToken(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        return Arrays.stream(request.getCookies())
                .filter(cookie -> SessionAuthenticationFilter.COOKIE_NAME.equals(cookie.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }
}
