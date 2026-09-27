package com.ceroa.domain;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "financial_profiles")
public class FinancialProfile {

    @Id
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "monthly_income", nullable = false, precision = 19, scale = 2)
    private BigDecimal monthlyIncome;

    @Column(name = "essential_expenses", nullable = false, precision = 19, scale = 2)
    private BigDecimal essentialExpenses;

    @Column(name = "available_for_debts", nullable = false, precision = 19, scale = 2)
    private BigDecimal availableForDebts;

    @Column(name = "total_declared_debts", nullable = false)
    private Integer totalDeclaredDebts;

    @Enumerated(EnumType.STRING)
    @Column(name = "active_strategy", nullable = false, length = 20)
    private StrategyType activeStrategy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @Column(name = "priority_debt_id")
    private UUID priorityDebtId;

    public UUID getPriorityDebtId() { return priorityDebtId; }
    public void setPriorityDebtId(UUID id) { this.priorityDebtId = id; }

    public FinancialProfile() {}

    @PrePersist
    void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        if (id == null) id = UUID.randomUUID();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() { updatedAt = OffsetDateTime.now(); }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public BigDecimal getMonthlyIncome() { return monthlyIncome; }
    public void setMonthlyIncome(BigDecimal monthlyIncome) { this.monthlyIncome = monthlyIncome; }
    public BigDecimal getEssentialExpenses() { return essentialExpenses; }
    public void setEssentialExpenses(BigDecimal essentialExpenses) { this.essentialExpenses = essentialExpenses; }
    public BigDecimal getAvailableForDebts() { return availableForDebts; }
    public void setAvailableForDebts(BigDecimal availableForDebts) { this.availableForDebts = availableForDebts; }
    public Integer getTotalDeclaredDebts() { return totalDeclaredDebts; }
    public void setTotalDeclaredDebts(Integer totalDeclaredDebts) { this.totalDeclaredDebts = totalDeclaredDebts; }
    public StrategyType getActiveStrategy() { return activeStrategy; }
    public void setActiveStrategy(StrategyType activeStrategy) { this.activeStrategy = activeStrategy; }
}
