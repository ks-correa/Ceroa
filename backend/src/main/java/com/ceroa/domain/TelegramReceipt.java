package com.ceroa.domain;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
@Entity @Table(name="telegram_receipts")
public class TelegramReceipt {
    @Id public Long id;
    @Column(name="created_at",nullable=false) public OffsetDateTime createdAt;
}
