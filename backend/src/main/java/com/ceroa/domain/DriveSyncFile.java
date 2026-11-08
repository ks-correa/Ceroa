package com.ceroa.domain;
import jakarta.persistence.*;
import java.util.UUID;
import java.time.OffsetDateTime;
@Entity @Table(name="drive_sync_files",uniqueConstraints=@UniqueConstraint(columnNames={"source_id","file_id"}))
public class DriveSyncFile {
    @Id public UUID id;
    @Column(name="source_id",nullable=false) public UUID sourceId;
    @Column(name="file_id",nullable=false,length=200) public String fileId;
    @Column(name="last_version",length=30) public String lastVersion;
    @Column(name="last_checksum",length=32) public String lastChecksum;
    @Column(name="pending_version",length=30) public String pendingVersion;
    @Column(name="pending_checksum",length=32) public String pendingChecksum;
    @Column(name="file_name",length=255) public String fileName;
    @Column(name="mime_type",length=100) public String mimeType;
    @Column(name="document_id") public UUID documentId;
    @Column(name="document_version") public Integer documentVersion;
    @Column(length=24,nullable=false) public String status;
    @Column(name="lease_token") public UUID leaseToken;
    @Column(name="lease_until") public OffsetDateTime leaseUntil;
    @Column(name="updated_at",nullable=false) public OffsetDateTime updatedAt;
    @PrePersist void create(){if(id==null)id=UUID.randomUUID();updatedAt=OffsetDateTime.now();}
    @PreUpdate void update(){updatedAt=OffsetDateTime.now();}
}
