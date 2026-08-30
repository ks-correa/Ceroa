package com.ceroa.service;

import com.ceroa.api.dto.LoginRequest;
import com.ceroa.api.dto.RegisterRequest;
import com.ceroa.api.dto.UserResponse;
import com.ceroa.domain.*;
import com.ceroa.exception.BusinessRuleException;
import com.ceroa.exception.InvalidCredentialsException;
import com.ceroa.repository.AuthSessionRepository;
import com.ceroa.repository.FinancialProfileRepository;
import com.ceroa.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Locale;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final FinancialProfileRepository financialProfileRepository;
    private final AuthSessionRepository sessionRepository;
    private final PasswordEncoder passwordEncoder;
    private final SessionTokenService tokenService;
    private final long sessionDays;

    public AuthService(
            UserRepository userRepository,
            FinancialProfileRepository financialProfileRepository,
            AuthSessionRepository sessionRepository,
            PasswordEncoder passwordEncoder,
            SessionTokenService tokenService,
            @Value("${ceroa.session.days:30}") long sessionDays) {
        this.userRepository = userRepository;
        this.financialProfileRepository = financialProfileRepository;
        this.sessionRepository = sessionRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenService = tokenService;
        this.sessionDays = sessionDays;
    }

    @Transactional
    public AuthResult register(RegisterRequest request) {
        String email = normalizeEmail(request.email());
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new BusinessRuleException("EMAIL_ALREADY_EXISTS", "Ya existe una cuenta con ese correo.");
        }
        if (request.birthDate() != null && request.birthDate().isAfter(LocalDate.now().minusYears(18))) {
            throw new BusinessRuleException("MINIMUM_AGE", "Debes ser mayor de edad para crear una cuenta.");
        }

        User user = new User();
        user.setFullName(request.fullName().trim());
        user.setEmail(email);
        user.setPhone(blankToNull(request.phone()));
        user.setBirthDate(request.birthDate());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setPlan(UserPlan.CERO);
        user = userRepository.save(user);

        FinancialProfile profile = new FinancialProfile();
        profile.setUser(user);
        profile.setMonthlyIncome(BigDecimal.ONE);
        profile.setEssentialExpenses(BigDecimal.ZERO);
        profile.setAvailableForDebts(BigDecimal.ZERO);
        profile.setTotalDeclaredDebts(1);
        profile.setActiveStrategy(StrategyType.SNOWBALL);
        financialProfileRepository.save(profile);

        return createSession(user);
    }

    @Transactional
    public AuthResult login(LoginRequest request) {
        User user = userRepository.findByEmailIgnoreCase(normalizeEmail(request.email()))
                .orElseThrow(this::invalidCredentials);
        if (!user.isActive() || user.getPasswordHash() == null
                || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw invalidCredentials();
        }
        return createSession(user);
    }

    @Transactional
    public void logout(String rawToken) {
        if (rawToken != null && !rawToken.isBlank()) {
            sessionRepository.deleteByTokenHash(tokenService.hash(rawToken));
        }
    }

    public UserResponse toResponse(User user) {
        return new UserResponse(
                user.getId(), user.getFullName(), user.getEmail(), user.getPhone(), user.getDocumentId(), user.getBirthDate(),
                user.getPlan());
    }

    private AuthResult createSession(User user) {
        String rawToken = tokenService.createRawToken();
        AuthSession session = new AuthSession();
        session.setUser(user);
        session.setTokenHash(tokenService.hash(rawToken));
        session.setExpiresAt(OffsetDateTime.now().plusDays(sessionDays));
        sessionRepository.save(session);
        return new AuthResult(rawToken, toResponse(user));
    }

    private InvalidCredentialsException invalidCredentials() {
        return new InvalidCredentialsException("Correo o contraseña incorrectos.");
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
