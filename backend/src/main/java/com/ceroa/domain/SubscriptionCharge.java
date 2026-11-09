package com.ceroa.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

/** Durable provider charge receipt, independent of communication delivery. */
@Entity @Table(name="subscription_charges")
public class SubscriptionCharge {
    @Id @Column(length=160) public String id;
    @Column(name="subscription_id",nullable=false) public UUID subscriptionId;
    @Column(name="billing_boundary") public OffsetDateTime billingBoundary;
    @Column(name="observed_at",nullable=false) public OffsetDateTime observedAt;
}
