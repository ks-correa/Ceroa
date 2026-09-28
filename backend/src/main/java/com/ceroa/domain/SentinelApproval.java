package com.ceroa.domain;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
@Entity @Table(name="sentinel_approvals")
public class SentinelApproval {
    @Id public UUID id;
    @Column(name="user_id",nullable=false) public UUID userId;
    @Column(name="alert_id",nullable=false) public UUID alertId;
    @Column(name="debt_id",nullable=false) public UUID debtId;
    @Column(nullable=false,length=20) public String strategy;
    @Column(nullable=false,length=24) public String action="GENERATE_SIMULATION";
    @Column(name="financial_version",nullable=false) public long financialVersion;
    @Column(name="issued_at",nullable=false) public OffsetDateTime issuedAt;
    @Column(name="expires_at",nullable=false) public OffsetDateTime expiresAt;
    @Column(nullable=false,length=20) public String status="PENDING";
    @Column(name="result_status",length=30) public String resultStatus;
    @Column(name="result_reason",length=1000) public String resultReason;
    @Column(name="result_assumptions",length=2000) public String resultAssumptions;
    @Column(name="projected_months") public Integer projectedMonths;
    @Column(name="projected_interest",precision=19,scale=2) public BigDecimal projectedInterest;
}
