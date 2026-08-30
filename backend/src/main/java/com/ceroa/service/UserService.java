package com.ceroa.service;

import com.ceroa.api.dto.UserResponse;
import com.ceroa.api.dto.UserUpdateRequest;
import com.ceroa.domain.User;
import com.ceroa.exception.BusinessRuleException;
import com.ceroa.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
public class UserService {
    private final UserRepository userRepository;
    private final CurrentUserService currentUser;
    private final AuthService authService;

    public UserService(UserRepository userRepository, CurrentUserService currentUser, AuthService authService) {
        this.userRepository = userRepository;
        this.currentUser = currentUser;
        this.authService = authService;
    }

    @Transactional
    public UserResponse update(UserUpdateRequest request) {
        User user = currentUser.entity();
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        userRepository.findByEmailIgnoreCase(email)
                .filter(existing -> !existing.getId().equals(user.getId()))
                .ifPresent(existing -> {
                    throw new BusinessRuleException("EMAIL_ALREADY_EXISTS", "Ya existe una cuenta con ese correo.");
                });
        user.setFullName(request.fullName().trim());
        user.setEmail(email);
        user.setPhone(request.phone() == null || request.phone().isBlank() ? null : request.phone().trim());
        return authService.toResponse(userRepository.save(user));
    }
}
