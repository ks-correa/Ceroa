package com.ceroa.service;

import com.ceroa.domain.PasswordRecovery;
import com.ceroa.exception.BusinessRuleException;
import com.ceroa.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.*;

@Service
public class PasswordRecoveryService {
    private final PasswordRecoveryRepository recoveries;
    private final UserRepository users;
    private final AuthSessionRepository sessions;
    private final PasswordEncoder encoder;
    private final SessionTokenService tokens;
    private final RecoveryMailService mail;
    private final SecureRandom random = new SecureRandom();
    public PasswordRecoveryService(PasswordRecoveryRepository recoveries, UserRepository users,
            AuthSessionRepository sessions, PasswordEncoder encoder, SessionTokenService tokens, RecoveryMailService mail) {
        this.recoveries = recoveries; this.users = users; this.sessions = sessions;
        this.encoder = encoder; this.tokens = tokens; this.mail = mail;
    }

    // No account lookup or SMTP call in the public request: same path for every email.
    // Serializable isolation also enforces the quotas under concurrent requests across instances.
    @Transactional(isolation = Isolation.SERIALIZABLE)
    public UUID request(String email, String source) {
        if (!mail.available()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE);
        String normalized = email.toLowerCase(Locale.ROOT);
        String sourceHash = tokens.hash(source);
        var now = OffsetDateTime.now();
        if (recoveries.countByEmailAndCreatedAtAfter(normalized, now.minusHours(1)) >= 3
                || recoveries.countBySourceHashAndCreatedAtAfter(sourceHash, now.minusHours(1)) >= 20)
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS);
        PasswordRecovery recovery = new PasswordRecovery();
        recovery.id = UUID.randomUUID(); recovery.email = normalized; recovery.sourceHash = sourceHash;
        recovery.createdAt = now; recovery.expiresAt = now.plusMinutes(10); recovery.state = "PENDING";
        recoveries.save(recovery);
        return recovery.id;
    }

    @Transactional
    public void deliver(UUID id) {
        var r = recoveries.lockById(id).orElse(null);
        if (r == null || !r.state.equals("PENDING")) return;
        if (!r.expiresAt.isAfter(OffsetDateTime.now())) { r.state = "FAILED"; return; }
        r.user = users.findByEmailIgnoreCase(r.email).filter(u -> u.isActive()).orElse(null);
        String code = String.format(Locale.ROOT, "%08d", random.nextInt(100_000_000));
        r.codeHash = encoder.encode(code);
        try {
            if (r.user != null) mail.send(r.email, code);
            r.state = "SENT";
        } catch (RuntimeException error) {
            r.state = "FAILED"; r.codeHash = null;
            org.slf4j.LoggerFactory.getLogger(getClass()).warn("Recovery mail delivery failed");
        }
    }

    // Rejections must commit the attempt counter, including the final allowed attempt.
    @Transactional(noRollbackFor = BusinessRuleException.class)
    public String verify(UUID id, String code) {
        var r = recoveries.lockById(id).orElseThrow(this::invalid);
        if (!r.expiresAt.isAfter(OffsetDateTime.now()))
            throw new BusinessRuleException("RECOVERY_EXPIRED", "El código venció. Solicita uno nuevo.");
        if (r.attempts >= 5) throw new BusinessRuleException("RECOVERY_ATTEMPTS", "Se agotaron los intentos. Solicita un nuevo código.");
        if (!r.state.equals("SENT")) throw invalid();
        r.attempts++;
        boolean matches = encoder.matches(code, r.codeHash);
        if (!matches || r.user == null || !r.user.isActive()) throw invalid();
        String grant = tokens.createRawToken();
        r.grantHash = tokens.hash(grant); r.grantExpiresAt = OffsetDateTime.now().plusMinutes(5);
        r.state = "VERIFIED"; r.codeHash = null;
        return grant;
    }

    @Transactional
    public void reset(UUID id, String grant, String password) {
        var r = recoveries.lockById(id).orElseThrow(this::invalid);
        if (!r.state.equals("VERIFIED") || grant == null || r.grantHash == null
                || !java.security.MessageDigest.isEqual(tokens.hash(grant).getBytes(java.nio.charset.StandardCharsets.US_ASCII),
                    r.grantHash.getBytes(java.nio.charset.StandardCharsets.US_ASCII))) throw invalid();
        if (!r.grantExpiresAt.isAfter(OffsetDateTime.now()))
            throw new BusinessRuleException("RECOVERY_EXPIRED", "La autorización venció. Solicita un nuevo código.");
        var user = users.findByIdForUpdate(r.user.getId()).orElseThrow(this::invalid);
        // A successful reset invalidates every earlier challenge, including other verified ones.
        if (!user.isActive() || (user.getPasswordChangedAt() != null && !r.createdAt.isAfter(user.getPasswordChangedAt()))) throw invalid();
        user.setPasswordHash(encoder.encode(password));
        user.setPasswordChangedAt(OffsetDateTime.now());
        sessions.deleteAllByUserId(user.getId());
        r.state = "USED"; r.grantHash = null; r.codeHash = null;
    }
    private BusinessRuleException invalid() {
        return new BusinessRuleException("RECOVERY_INVALID", "Código o autorización no válidos. Revisa el código o solicita uno nuevo.");
    }
}
