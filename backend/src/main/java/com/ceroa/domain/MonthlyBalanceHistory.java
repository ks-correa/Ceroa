package com.ceroa.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "monthly_balance_history")
public class MonthlyBalanceHistory {
    @Id private UUID id;
    @Column(name = "user_id", nullable = false) private UUID userId;
    @Column(name = "recorded_at", nullable = false) private OffsetDateTime recordedAt;
    @Column(nullable = false, precision = 19, scale = 2) private BigDecimal balance;
    @Column(name = "payment_delta", precision = 19, scale = 2) private BigDecimal paymentDelta;
    @Column(name = "payment_count_delta") private Integer paymentCountDelta;
    @Column(name = "closed_debt_delta") private Integer closedDebtDelta;
}
