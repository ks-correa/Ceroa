package com.ceroa.domain;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
@Entity @Table(name="workspace_actions")
public class WorkspaceAction {
    @Id public UUID id;
    @Column(name="owner_id",nullable=false) public UUID ownerId;
    @Column(nullable=false,length=40) public String kind;
    @Column(name="confirmation_code",nullable=false,unique=true,length=24) public String confirmationCode;
    @Column(nullable=false,length=20) public String status="PROPOSED";
    @Column(name="expires_at",nullable=false) public OffsetDateTime expiresAt;
    @Column(name="event_id") public UUID eventId;
    @Column(name="created_at",nullable=false) public OffsetDateTime createdAt;
    @PrePersist void create(){if(id==null)id=UUID.randomUUID();createdAt=OffsetDateTime.now();}
}
