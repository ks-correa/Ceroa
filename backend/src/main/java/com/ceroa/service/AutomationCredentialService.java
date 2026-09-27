package com.ceroa.service;

import com.ceroa.domain.AutomationToken;
import com.ceroa.exception.BusinessRuleException;
import com.ceroa.exception.ResourceNotFoundException;
import com.ceroa.repository.AutomationTokenRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.OffsetDateTime;
import java.util.*;

@Service
public class AutomationCredentialService {
    public record TokenView(UUID id, String name, boolean allowWrites, OffsetDateTime createdAt,
                            OffsetDateTime expiresAt, OffsetDateTime revokedAt) {}
    public record IssuedToken(TokenView credential, String token) {}
    private final AutomationTokenRepository tokens;
    private final SessionTokenService secrets;
    private final CurrentUserService currentUser;

    public AutomationCredentialService(AutomationTokenRepository tokens, SessionTokenService secrets,
                                       CurrentUserService currentUser) {
        this.tokens = tokens; this.secrets = secrets; this.currentUser = currentUser;
    }

    @Transactional
    public IssuedToken issue(String name, boolean allowWrites, int days) {
        var user = currentUser.entityForUpdate();
        if (!user.isActive()) throw new BusinessRuleException("INACTIVE_USER", "La cuenta no está activa.");
        long active = tokens.findAllByUserIdOrderByCreatedAtDesc(user.getId()).stream().filter(AutomationToken::usable).count();
        if (active >= 10) throw new BusinessRuleException("TOKEN_LIMIT", "Revoca una credencial antes de crear otra.");
        String raw = "ceroa_" + secrets.createRawToken();
        var token = new AutomationToken();
        token.id = UUID.randomUUID(); token.user = user; token.name = name.trim();
        token.allowWrites = allowWrites; token.tokenHash = secrets.hash(raw);
        token.createdAt = OffsetDateTime.now(); token.expiresAt = token.createdAt.plusDays(days);
        tokens.save(token);
        return new IssuedToken(view(token), raw);
    }

    @Transactional(readOnly = true)
    public List<TokenView> list() {
        return tokens.findAllByUserIdOrderByCreatedAtDesc(currentUser.id()).stream().map(this::view).toList();
    }

    @Transactional
    public void revoke(UUID id) {
        var token = tokens.lockById(id).filter(t -> t.user.getId().equals(currentUser.id()))
            .orElseThrow(() -> new ResourceNotFoundException("Credencial no encontrada"));
        if (token.revokedAt == null) token.revokedAt = OffsetDateTime.now();
    }

    private TokenView view(AutomationToken token) {
        return new TokenView(token.id, token.name, token.allowWrites, token.createdAt, token.expiresAt, token.revokedAt);
    }
}
