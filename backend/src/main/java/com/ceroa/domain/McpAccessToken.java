package com.ceroa.domain;
import jakarta.persistence.*;import java.util.*;import java.time.*;
@Entity @Table(name="mcp_access_tokens")
public class McpAccessToken {
 @Id public UUID id;
 @Column(name="owner_id",nullable=false) public UUID ownerId;
 @Column(name="token_hash",nullable=false,unique=true,length=64) public String tokenHash;
 @Column(nullable=false,length=250) public String scopes;
 @Column(name="expires_at",nullable=false) public OffsetDateTime expiresAt;
 @Column(name="revoked_at") public OffsetDateTime revokedAt;
 @PrePersist void create(){if(id==null)id=UUID.randomUUID();}
}
