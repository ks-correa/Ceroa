package com.ceroa.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

/** Operational outbox; never used for authentication, password recovery or financial writes. */
@Entity @Table(name="integration_events")
public class IntegrationEvent {
    @Id public UUID id;
    @Version public long revision;
    @Column(name="dedupe_key",nullable=false,unique=true,length=200) public String dedupeKey;
    @Column(nullable=false,length=20) public String channel;
    @Column(nullable=false,length=40) public String kind;
    @Column(name="owner_id") public UUID ownerId;
    @Column(length=254) public String recipient;
    @Column(nullable=false,columnDefinition="text") public String payload;
    @Column(nullable=false,length=24) public String status="PENDING";
    public int attempts;
    @Column(name="next_attempt_at",nullable=false) public OffsetDateTime nextAttemptAt;
    @Column(name="lease_until") public OffsetDateTime leaseUntil;
    @Column(name="lease_token") public UUID leaseToken;
    @Column(name="provider_id",length=200) public String providerId;
    @Column(name="error_code",length=50) public String errorCode;
    @Column(name="created_at",nullable=false) public OffsetDateTime createdAt;
    @Column(name="updated_at",nullable=false) public OffsetDateTime updatedAt;
    @PrePersist void create(){if(id==null)id=UUID.randomUUID();createdAt=OffsetDateTime.now();updatedAt=createdAt;if(nextAttemptAt==null)nextAttemptAt=createdAt;}
    @PreUpdate void update(){updatedAt=OffsetDateTime.now();}
}
