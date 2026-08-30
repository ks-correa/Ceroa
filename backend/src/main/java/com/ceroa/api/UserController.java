package com.ceroa.api;

import com.ceroa.api.dto.UserResponse;
import com.ceroa.api.dto.UserUpdateRequest;
import com.ceroa.service.AuthService;
import com.ceroa.service.CurrentUserService;
import com.ceroa.service.UserService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users/me")
public class UserController {
    private final UserService userService;
    private final AuthService authService;
    private final CurrentUserService currentUser;

    public UserController(UserService userService, AuthService authService, CurrentUserService currentUser) {
        this.userService = userService;
        this.authService = authService;
        this.currentUser = currentUser;
    }

    @GetMapping
    public UserResponse get() {
        return authService.toResponse(currentUser.entity());
    }

    @PutMapping
    public UserResponse update(@Valid @RequestBody UserUpdateRequest request) {
        return userService.update(request);
    }
}
