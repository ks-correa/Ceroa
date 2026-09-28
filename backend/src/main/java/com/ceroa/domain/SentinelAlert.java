package com.ceroa.domain;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
@Entity @Table(name="sentinel_alerts",uniqueConstraints=@UniqueConstraint(columnNames={"user_id","episode_id"}))
public class SentinelAlert {
    @Id public UUID id;
    @Column(name="user_id",nullable=false) public UUID userId;
    @Column(name="episode_id",nullable=false) public UUID episodeId;
    @Column(name="notification_id",nullable=false) public UUID notificationId;
    @Column(name="financial_version",nullable=false) public long financialVersion;
    @Column(nullable=false,precision=19,scale=2) public BigDecimal budget;
    @Column(name="required_payments",nullable=false,precision=19,scale=2) public BigDecimal requiredPayments;
    @Column(nullable=false,precision=19,scale=2) public BigDecimal shortfall;
    @Column(name="created_at",nullable=false) public OffsetDateTime createdAt;
    @Column(name="delivery_status",nullable=false,length=20) public String deliveryStatus="PENDING";
    @Column(name="delivery_attempts",nullable=false) public int deliveryAttempts;
    @Column(name="next_attempt",nullable=false) public OffsetDateTime nextAttempt;
    @Column(name="delivery_expires_at",nullable=false) public OffsetDateTime deliveryExpiresAt;
    @Column(name="lease_hash",length=64) public String leaseHash;
    @Column(name="lease_expires_at") public OffsetDateTime leaseExpiresAt;
    @Column(name="validated_at") public OffsetDateTime validatedAt;
    @Column(name="linked_at") public OffsetDateTime linkedAt;
    @Column(name="chat_id") public Long chatId;
    @Column(name="telegram_message_id") public Long telegramMessageId;
    @Column(name="sent_at") public OffsetDateTime sentAt;
    @Column(name="delivery_error",length=40) public String deliveryError;
}
