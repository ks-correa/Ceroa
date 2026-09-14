package com.ceroa.api;

import com.ceroa.api.dto.LoginRequest;
import com.ceroa.api.dto.RegisterRequest;
import com.ceroa.api.dto.UserResponse;
import com.ceroa.config.SessionAuthenticationFilter;
import com.ceroa.service.AuthResult;
import com.ceroa.service.AuthService;
import com.ceroa.service.CurrentUserService;
import com.ceroa.service.AuthCookieService;
import com.ceroa.config.OAuthHandlers;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.web.csrf.CsrfToken;

import java.util.Arrays;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final AuthService authService;
    private final CurrentUserService currentUser;
    private final AuthCookieService cookies;

    public AuthController(
            AuthService authService,
            CurrentUserService currentUser,
            AuthCookieService cookies) {
        this.authService = authService;
        this.currentUser = currentUser;
        this.cookies = cookies;
    }

    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(@Valid @RequestBody RegisterRequest request, HttpServletRequest servletRequest) {
        AuthResult result = authService.register(request);
        OAuthHandlers.clear(servletRequest);
        return authenticated(result);
    }

    @PostMapping("/login")
    public ResponseEntity<UserResponse> login(@Valid @RequestBody LoginRequest request, HttpServletRequest servletRequest) {
        AuthResult result = authService.login(request);
        OAuthHandlers.clear(servletRequest);
        return authenticated(result);
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
        if (request.getSession(false) != null) request.getSession(false).invalidate();
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, cookies.issue(""))
                .build();
    }

    private ResponseEntity<UserResponse> authenticated(AuthResult result) {
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookies.issue(result.token()))
                .body(result.user());
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
