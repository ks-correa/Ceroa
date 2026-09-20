package com.ceroa.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "plus_subscriptions")
public class PlusSubscription {
    @Id public UUID id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "user_id", nullable = false) public User user;
    @Column(nullable = false) public String provider = "MERCADO_PAGO";
    @Column(nullable = false) public String periodicity;
    @Column(nullable = false) public String status = "PENDING";
    @Column(name = "provider_id", length = 100) public String providerId;
    @Column(name = "checkout_url", length = 1000) public String checkoutUrl;
    @Column(nullable = false) public BigDecimal amount;
    @Column(nullable = false) public String currency;
    @Column(name = "automatic_renewal", nullable = false) public boolean automaticRenewal = true;
    @Column(name = "started_at") public OffsetDateTime startedAt;
    @Column(name = "next_payment_at") public OffsetDateTime nextPaymentAt;
    @Column(name = "created_at", nullable = false) public OffsetDateTime createdAt;
    @Column(name = "updated_at", nullable = false) public OffsetDateTime updatedAt;
    @PrePersist void create() { if (id == null) id = UUID.randomUUID(); createdAt = OffsetDateTime.now(); updatedAt = createdAt; }
    @PreUpdate void update() { updatedAt = OffsetDateTime.now(); }
}
