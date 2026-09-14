package com.ceroa.service;

import com.ceroa.api.dto.UserResponse;
import com.ceroa.api.dto.UserUpdateRequest;
import com.ceroa.domain.User;
import com.ceroa.exception.BusinessRuleException;
import com.ceroa.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;

@Service
public class UserService {
    private static final ZoneId BOGOTA = ZoneId.of("America/Bogota");

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

        // fullName must not be blank (not just whitespace)
        if (request.fullName() == null || request.fullName().isBlank()) {
            throw new BusinessRuleException("VALIDATION_ERROR", "El nombre completo no puede estar vacío.");
        }
        user.setFullName(request.fullName().trim());

        user.setPhone(request.phone() == null || request.phone().isBlank()
                ? null : request.phone().trim());
        user.setDocumentId(request.documentId() == null || request.documentId().isBlank()
                ? null : request.documentId().trim());

        if (request.birthDate() != null) {
            LocalDate today = LocalDate.now(BOGOTA);
            if (request.birthDate().isAfter(today)) {
                throw new BusinessRuleException("INVALID_BIRTH_DATE", "La fecha de nacimiento no puede ser futura.");
            }
            if (request.birthDate().plusYears(18).isAfter(today)) {
                throw new BusinessRuleException("UNDERAGE", "Debes tener al menos 18 años.");
            }
            user.setBirthDate(request.birthDate());
        }

        return authService.toResponse(userRepository.save(user));
    }
}
