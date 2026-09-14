package com.ceroa.api;

import com.ceroa.api.dto.*;
import com.ceroa.service.AuthService;
import com.ceroa.service.CurrentUserService;
import com.ceroa.service.EmailChangeService;
import com.ceroa.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users/me")
public class UserController {
    private final UserService userService;
    private final AuthService authService;
    private final CurrentUserService currentUser;
    private final EmailChangeService emailChangeService;

    public UserController(UserService userService, AuthService authService,
            CurrentUserService currentUser, EmailChangeService emailChangeService) {
        this.userService = userService;
        this.authService = authService;
        this.currentUser = currentUser;
        this.emailChangeService = emailChangeService;
    }

    @GetMapping
    public UserResponse get() {
        return authService.toResponse(currentUser.entity());
    }

    @PutMapping
    public UserResponse update(@Valid @RequestBody UserUpdateRequest request) {
        return userService.update(request);
    }

    /**
     * HU-016: Initiates an email change request. Sends a verification code to the new email.
     */
    @PostMapping("/email/change")
    public ResponseEntity<Map<String, Object>> requestEmailChange(
            @Valid @RequestBody EmailChangeRequest request,
            HttpServletRequest httpRequest) {
        String source = httpRequest.getRemoteAddr();
        UUID requestId = emailChangeService.request(request.newEmail(), source);
        return ResponseEntity.accepted().body(Map.of(
            "requestId", requestId,
            "message", "Se envió un código de verificación al nuevo correo. Vence en 10 minutos."
        ));
    }

    /**
     * HU-017: Verifies the code and atomically updates the user's email.
     */
    @PostMapping("/email/verify")
    public UserResponse verifyEmailChange(@Valid @RequestBody EmailVerifyRequest request) {
        emailChangeService.verify(request.requestId(), request.code());
        return authService.toResponse(currentUser.entity());
    }
}
