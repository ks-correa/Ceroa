package com.ceroa.domain;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
@Entity @Table(name="sentinel_preferences")
public class SentinelPreference {
    @Id @Column(name="user_id") public UUID userId;
    @Column(name="telegram_alerts",nullable=false) public boolean telegramAlerts;
    @Column(name="consent_linked_at") public OffsetDateTime consentLinkedAt;
    @Column(name="updated_at",nullable=false) public OffsetDateTime updatedAt;
}
