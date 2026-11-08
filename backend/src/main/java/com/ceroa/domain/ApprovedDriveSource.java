package com.ceroa.domain;
import jakarta.persistence.*;
import java.util.UUID;
@Entity @Table(name="approved_drive_sources")
public class ApprovedDriveSource {
    @Id public UUID id;
    @PrePersist void create(){if(id==null)id=UUID.randomUUID();}
    @Column(name="owner_id",nullable=false) public UUID ownerId;
    @Column(name="folder_id",nullable=false,length=200) public String folderId;
    public boolean active;
    @Column(name="approved_at",nullable=false) public java.time.OffsetDateTime approvedAt;
}
