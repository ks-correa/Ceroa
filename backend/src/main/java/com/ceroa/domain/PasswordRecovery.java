package com.ceroa.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

/** Internal persistence model. Never returned or logged by the API. */
@Entity
@Table(name = "password_recoveries")
public class PasswordRecovery {
    @Id public UUID id;
    @Column(nullable = false, length = 254) public String email;
    @Column(name = "source_hash", nullable = false, length = 64) public String sourceHash;
    @ManyToOne(fetch = FetchType.EAGER) @JoinColumn(name = "user_id") public User user;
    @Column(name = "code_hash", length = 100) public String codeHash;
    @Column(name = "grant_hash", length = 64) public String grantHash;
    @Column(name = "created_at", nullable = false) public OffsetDateTime createdAt;
    @Column(name = "expires_at", nullable = false) public OffsetDateTime expiresAt;
    @Column(name = "grant_expires_at") public OffsetDateTime grantExpiresAt;
    @Column(nullable = false) public int attempts;
    @Column(nullable = false, length = 20) public String state;
    @Column(nullable = false, length = 20) public String purpose = "PASSWORD_RESET";
    @Column(name = "new_email", length = 254) public String newEmail;
}
