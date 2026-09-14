package com.ceroa.service;

import com.ceroa.api.dto.ExternalRegistrationRequest;
import com.ceroa.domain.ExternalIdentity;
import com.ceroa.domain.User;
import com.ceroa.exception.BusinessRuleException;
import com.ceroa.exception.InvalidCredentialsException;
import com.ceroa.repository.ExternalIdentityRepository;
import com.ceroa.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.Optional;

@Service
@org.springframework.validation.annotation.Validated
public class ExternalAuthService {
    private final ExternalIdentityRepository identities;
    private final UserRepository users;
    private final AuthService auth;
    public ExternalAuthService(ExternalIdentityRepository identities, UserRepository users, AuthService auth) {
        this.identities = identities; this.users = users; this.auth = auth;
    }
    @Transactional
    public Optional<AuthResult> login(PendingIdentity identity) {
        requireValid(identity);
        return identities.findByProviderAndIssuerAndSubject(identity.provider(), identity.issuer(), identity.subject())
            .map(existing -> {
                if (!existing.getUser().isActive()) throw new InvalidCredentialsException("No fue posible iniciar sesión.");
                return auth.createSession(existing.getUser());
            });
    }
    @Transactional
    public AuthResult complete(PendingIdentity identity, @jakarta.validation.Valid ExternalRegistrationRequest request) {
        requireValid(identity);
        if (request.birthDate().isAfter(java.time.LocalDate.now(java.time.ZoneId.of("America/Bogota")).minusYears(18)))
            throw new BusinessRuleException("MINIMUM_AGE", "Debes tener al menos 18 años.");
        var existing = login(identity);
        if (existing.isPresent()) return existing.get();
        String email = (identity.email() == null ? request.email() : identity.email()).toLowerCase(Locale.ROOT);
        // Never link an identity to an existing account using an email claim alone.
        if (users.existsByEmailIgnoreCase(email))
            throw new BusinessRuleException("ACCOUNT_CONFLICT", "No se pudo crear la cuenta. Intenta ingresar con tu método de acceso original.");
        User user = new User();
        user.setFullName(request.fullName().trim()); user.setEmail(email);
        user.setPhone(request.phone()); user.setBirthDate(request.birthDate());
        user.setTermsAcceptedAt(OffsetDateTime.now()); user.setPrivacyAcceptedAt(OffsetDateTime.now());
        users.saveAndFlush(user);
        identities.saveAndFlush(new ExternalIdentity(user, identity.provider(), identity.issuer(), identity.subject()));
        return auth.createSession(user);
    }
    public void requireValid(PendingIdentity identity) {
        if (identity == null || !identity.expiresAt().isAfter(Instant.now()))
            throw new InvalidCredentialsException("El registro venció. Continúa nuevamente con tu proveedor.");
    }
}
