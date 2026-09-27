package com.ceroa.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "automation_tokens")
public class AutomationToken {
    @Id public UUID id;
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "user_id", nullable = false) public User user;
    @Column(nullable = false, length = 80) public String name;
    @Column(name = "token_hash", nullable = false, unique = true, length = 64) public String tokenHash;
    @Column(name = "allow_writes", nullable = false) public boolean allowWrites;
    @Column(name = "created_at", nullable = false) public OffsetDateTime createdAt;
    @Column(name = "expires_at", nullable = false) public OffsetDateTime expiresAt;
    @Column(name = "revoked_at") public OffsetDateTime revokedAt;

    public boolean usable() {
        return revokedAt == null && expiresAt.isAfter(OffsetDateTime.now()) && user.isActive();
    }
}
