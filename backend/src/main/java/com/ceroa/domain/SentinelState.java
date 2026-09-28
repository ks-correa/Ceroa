package com.ceroa.domain;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
@Entity @Table(name="sentinel_states")
public class SentinelState {
    @Id @Column(name="user_id") public UUID userId;
    @Column(name="financial_version",nullable=false) public long financialVersion;
    @Column(nullable=false,length=24) public String condition="UNKNOWN";
    @Column(nullable=false) public boolean dirty=true;
    @Column(name="episode_id") public UUID episodeId;
    @Column(name="evaluated_at") public OffsetDateTime evaluatedAt;
    @Column(name="updated_at",nullable=false) public OffsetDateTime updatedAt;
}
