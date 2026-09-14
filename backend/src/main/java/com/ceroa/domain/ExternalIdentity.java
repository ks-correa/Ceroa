package com.ceroa.domain;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "external_identities", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"provider", "issuer", "subject"}),
    @UniqueConstraint(columnNames = {"user_id", "provider"})
})
public class ExternalIdentity {
    @Id private UUID id = UUID.randomUUID();
    @ManyToOne(optional = false) @JoinColumn(name = "user_id", nullable = false) private User user;
    @Column(nullable = false, length = 20) private String provider;
    @Column(nullable = false) private String issuer;
    @Column(nullable = false) private String subject;
    public ExternalIdentity() {}
    public ExternalIdentity(User user, String provider, String issuer, String subject) {
        this.user = user; this.provider = provider; this.issuer = issuer; this.subject = subject;
    }
    public User getUser() { return user; }
}
