package com.ceroa.domain;
import jakarta.persistence.*;
import java.util.*;
import java.time.*;
@Entity @Table(name="support_bookings")
public class SupportBooking {
 @Id public UUID id;
 @Column(name="owner_id",nullable=false) public UUID ownerId;
 @Column(nullable=false,unique=true,length=20) public String code;
 @Column(name="slot_start",nullable=false) public OffsetDateTime start;
 @Column(name="slot_end",nullable=false) public OffsetDateTime end;
 @Column(name="expires_at",nullable=false) public OffsetDateTime expiresAt;
 @Column(nullable=false,length=32) public String status;
 @Column(name="active_slot",unique=true,length=100) public String activeSlot;
 @Column(name="provider_id",length=100) public String providerId;
 @Column(name="meet_url",length=200) public String meetUrl;
 @Column(name="cancel_code",length=20) public String cancelCode;
 @Column(name="cancel_expires_at") public OffsetDateTime cancelExpiresAt;
 @Version public long revision;
 @PrePersist void create(){if(id==null)id=UUID.randomUUID();}
}
