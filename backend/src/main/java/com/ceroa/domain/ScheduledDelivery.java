package com.ceroa.domain;
import jakarta.persistence.*;
import java.time.*;
import java.util.UUID;
@Entity @Table(name="scheduled_deliveries",uniqueConstraints=@UniqueConstraint(columnNames={"user_id","event_key"}))
public class ScheduledDelivery {
    @Id public UUID id;
    @Column(name="user_id",nullable=false) public UUID userId;
    @Column(name="notification_id",nullable=false) public UUID notificationId;
    @Column(name="event_key",nullable=false,length=160) public String eventKey;
    @Column(nullable=false,length=12) public String kind;
    @Column(name="debt_id") public UUID debtId;
    @Column(name="due_date") public LocalDate dueDate;
    @Column(length=20) public String milestone;
    @Column(name="period_date",nullable=false) public LocalDate periodDate;
    @Column(nullable=false,length=20) public String status="PENDING";
    @Column(nullable=false) public int attempts;
    @Column(name="next_attempt",nullable=false) public OffsetDateTime nextAttempt;
    @Column(name="expires_at",nullable=false) public OffsetDateTime expiresAt;
    @Column(name="lease_hash",length=64) public String leaseHash;
    @Column(name="lease_expires_at") public OffsetDateTime leaseExpiresAt;
    @Column(name="validated_at") public OffsetDateTime validatedAt;
    @Column(name="linked_at") public OffsetDateTime linkedAt;
    @Column(name="chat_id") public Long chatId;
    @Column(length=3500) public String message;
    @Column(name="telegram_message_id") public Long telegramMessageId;
    @Column(name="sent_at") public OffsetDateTime sentAt;
    @Column(name="last_error",length=40) public String lastError;
    @Column(name="created_at",nullable=false) public OffsetDateTime createdAt;
}
