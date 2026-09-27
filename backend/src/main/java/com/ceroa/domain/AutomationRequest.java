package com.ceroa.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "automation_requests", uniqueConstraints = @UniqueConstraint(columnNames = {"token_id", "request_key"}))
public class AutomationRequest {
    @Id public UUID id;
    @Column(name = "token_id", nullable = false) public UUID tokenId;
    @Column(name = "request_key", nullable = false) public UUID requestKey;
    @Column(name = "request_hash", nullable = false, length = 64) public String requestHash;
    @Column(name = "response_json", nullable = false, columnDefinition = "text") public String responseJson;
    @Column(name = "created_at", nullable = false) public OffsetDateTime createdAt;
}
