package com.ceroa.service;

import com.ceroa.domain.PasswordRecovery;
import com.ceroa.exception.BusinessRuleException;
import com.ceroa.repository.PasswordRecoveryRepository;
import com.ceroa.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.*;

@Service
public class EmailChangeService {
    private static final org.slf4j.Logger LOG = org.slf4j.LoggerFactory.getLogger(EmailChangeService.class);

    private final PasswordRecoveryRepository recoveries;
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final SessionTokenService tokens;
    private final EmailChangeMailService mail;
    private final CurrentUserService currentUser;
    private final SecureRandom random = new SecureRandom();

    public EmailChangeService(PasswordRecoveryRepository recoveries, UserRepository users,
            PasswordEncoder encoder, SessionTokenService tokens,
            EmailChangeMailService mail, CurrentUserService currentUser) {
        this.recoveries = recoveries;
        this.users = users;
        this.encoder = encoder;
        this.tokens = tokens;
        this.mail = mail;
        this.currentUser = currentUser;
    }

    /**
     * Initiates an email change request. Returns the request UUID.
     * Uses SERIALIZABLE isolation to enforce rate limits under concurrency.
     */
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public UUID request(String newEmail, String source) {
        if (!mail.available()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE);

        String normalized = newEmail.trim().toLowerCase(Locale.ROOT);
        var user = currentUser.entity();

        // Reject if same as current email
        if (normalized.equalsIgnoreCase(user.getEmail())) {
            throw new BusinessRuleException("EMAIL_SAME",
                "El nuevo correo es igual al correo actual.");
        }

        // Reject if already used by another account
        users.findByEmailIgnoreCase(normalized)
            .filter(existing -> !existing.getId().equals(user.getId()))
            .ifPresent(existing -> {
                throw new BusinessRuleException("EMAIL_ALREADY_EXISTS",
                    "Ya existe una cuenta con ese correo.");
            });

        String sourceHash = tokens.hash(source);
        var now = OffsetDateTime.now();

        // Rate limiting: max 3 email-change requests per destination address per hour
        long byEmail = recoveries.countByEmailAndCreatedAtAfter(normalized, now.minusHours(1));
        // Rate limiting: max 20 requests per source IP per hour (shared quota with password recovery)
        long bySource = recoveries.countBySourceHashAndCreatedAtAfter(sourceHash, now.minusHours(1));
        if (byEmail >= 3 || bySource >= 20)
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS);

        PasswordRecovery recovery = new PasswordRecovery();
        recovery.id = UUID.randomUUID();
        recovery.email = user.getEmail().toLowerCase(Locale.ROOT); // current email (for rate limiting)
        recovery.newEmail = normalized;
        recovery.sourceHash = sourceHash;
        recovery.createdAt = now;
        recovery.expiresAt = now.plusMinutes(10);
        recovery.state = "PENDING_EMAIL";
        recovery.purpose = "EMAIL_CHANGE";
        recovery.user = user;
        recoveries.save(recovery);
        return recovery.id;
    }

    /**
     * Called by the delivery job to send the verification code to the new email address.
     */
    @Transactional
    public void deliver(UUID id) {
        var r = recoveries.lockById(id).orElse(null);
        if (r == null || !r.state.equals("PENDING_EMAIL")) return;
        if (!r.expiresAt.isAfter(OffsetDateTime.now())) {
            r.state = "FAILED_EMAIL";
            return;
        }
        String code = String.format(Locale.ROOT, "%08d", random.nextInt(100_000_000));
        r.codeHash = encoder.encode(code);
        try {
            // Send to the NEW email address (not the old one)
            mail.sendEmailChangeCode(r.newEmail, code);
            r.state = "SENT_EMAIL";
        } catch (RuntimeException error) {
            r.state = "FAILED_EMAIL";
            r.codeHash = null;
            LOG.warn("Email change mail delivery failed");
        }
    }

    /**
     * Verifies the code and atomically updates the user's email.
     * Rejections commit the attempt counter to prevent brute-force attacks.
     */
    @Transactional(noRollbackFor = BusinessRuleException.class)
    public void verify(UUID id, String code) {
        var r = recoveries.lockById(id).orElseThrow(this::invalid);

        if (!r.state.equals("SENT_EMAIL")) throw invalid();

        if (!r.expiresAt.isAfter(OffsetDateTime.now()))
            throw new BusinessRuleException("EMAIL_CHANGE_EXPIRED", "El código venció. Solicita uno nuevo.");

        if (r.attempts >= 5)
            throw new BusinessRuleException("EMAIL_CHANGE_ATTEMPTS", "Se agotaron los intentos. Solicita un nuevo código.");

        r.attempts++;

        boolean matches = encoder.matches(code, r.codeHash);
        if (!matches) throw invalid();

        // Re-check uniqueness to guard against race conditions
        String normalized = r.newEmail;
        var userForUpdate = users.findByIdForUpdate(r.user.getId())
            .orElseThrow(this::invalid);

        if (!userForUpdate.isActive()) throw invalid();

        users.findByEmailIgnoreCase(normalized)
            .filter(existing -> !existing.getId().equals(userForUpdate.getId()))
            .ifPresent(existing -> {
                throw new BusinessRuleException("EMAIL_ALREADY_EXISTS",
                    "Ya existe una cuenta con ese correo.");
            });

        userForUpdate.setEmail(normalized);
        r.state = "USED_EMAIL";
        r.codeHash = null;
    }

    private BusinessRuleException invalid() {
        return new BusinessRuleException("EMAIL_CHANGE_INVALID",
            "Código no válido. Revisa el código o solicita uno nuevo.");
    }
}
