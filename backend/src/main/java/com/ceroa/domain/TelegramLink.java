package com.ceroa.domain;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
@Entity @Table(name="telegram_links")
public class TelegramLink {
    @Id @Column(name="user_id") public UUID userId;
    @Column(name="sender_id",unique=true) public Long senderId;
    @Column(name="chat_id",unique=true) public Long chatId;
    @Column(name="code_hash",unique=true,length=64) public String codeHash;
    @Column(name="code_expires_at") public OffsetDateTime codeExpiresAt;
    @Column(name="linked_at") public OffsetDateTime linkedAt;
    @Column(name="document_consent_at") public OffsetDateTime documentConsentAt;
}
