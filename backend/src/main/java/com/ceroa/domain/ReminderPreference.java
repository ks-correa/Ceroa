package com.ceroa.domain;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
@Entity @Table(name="reminder_preferences")
public class ReminderPreference {
    @Id @Column(name="user_id") public UUID userId;
    @Column(nullable=false) public boolean reminders;
    @Column(nullable=false) public boolean briefing;
    @Column(nullable=false,length=10) public String cadence="WEEKLY";
    @Column(name="delivery_hour",nullable=false) public int hour=8;
    @Column(name="consent_linked_at") public OffsetDateTime consentLinkedAt;
    @Column(name="updated_at",nullable=false) public OffsetDateTime updatedAt;
}
