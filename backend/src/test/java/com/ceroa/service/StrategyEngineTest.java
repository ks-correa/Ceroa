package com.ceroa.service;

import com.ceroa.api.dto.StrategyResponse;
import com.ceroa.domain.Debt;
import com.ceroa.domain.DebtType;
import com.ceroa.domain.RateType;
import com.ceroa.domain.StrategyType;
import com.ceroa.domain.UserPlan;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class StrategyEngineTest {

    private StrategyEngine engine;
    private RateNormalizationService rateService;
    private DebtPaymentResolver paymentResolver;

    @BeforeEach
    void setUp() {
        rateService = new RateNormalizationService();
        paymentResolver = new DebtPaymentResolver();
        engine = new StrategyEngine(rateService, paymentResolver);
    }

    private Debt createDebt(String name, BigDecimal balance, BigDecimal rate, RateType rateType, BigDecimal monthlyPayment, BigDecimal minimumPayment, OffsetDateTime createdAt) {
        Debt d = new Debt();
        d.setId(UUID.randomUUID());
        d.setName(name);
        d.setType(DebtType.PERSONAL_LOAN);
        d.setCategoryLabel("Préstamo");
        d.setCurrentBalance(balance);
        d.setOriginalAmount(balance);
        d.setInterestRate(rate);
        d.setRateType(rateType);
        d.setMonthlyPayment(monthlyPayment);
        d.setMinimumPayment(minimumPayment);
        try {
            java.lang.reflect.Field field = Debt.class.getDeclaredField("createdAt");
            field.setAccessible(true);
            field.set(d, createdAt != null ? createdAt : OffsetDateTime.now());
        } catch (Exception ignored) {}
        return d;
    }

    @Test
    void snowballOrdersByBalanceAscendingWithStableTieBreaker() {
        OffsetDateTime t1 = OffsetDateTime.now().minusDays(10);
        OffsetDateTime t2 = OffsetDateTime.now().minusDays(5);

        Debt d1 = createDebt("D1", new BigDecimal("5000000"), new BigDecimal("30.0"), RateType.EA, new BigDecimal("200000"), null, t2);
        Debt d2 = createDebt("D2", new BigDecimal("1000000"), new BigDecimal("10.0"), RateType.EA, new BigDecimal("100000"), null, t1);
        Debt d3 = createDebt("D3", new BigDecimal("1000000"), new BigDecimal("25.0"), RateType.EA, new BigDecimal("100000"), null, t2);

        StrategyResponse response = engine.execute(List.of(d1, d2, d3), StrategyType.SNOWBALL, UserPlan.PLUS, new BigDecimal("600000"));

        assertThat(response.orderedDebts()).hasSize(3);
        // d2 and d3 have balance 1.000.000; d2 was created earlier (t1 < t2), so d2 is first
        assertThat(response.orderedDebts().get(0).name()).isEqualTo("D2");
        assertThat(response.orderedDebts().get(0).priority()).isEqualTo(1);
        assertThat(response.orderedDebts().get(1).name()).isEqualTo("D3");
        assertThat(response.orderedDebts().get(1).priority()).isEqualTo(2);
        assertThat(response.orderedDebts().get(2).name()).isEqualTo("D1");
        assertThat(response.orderedDebts().get(2).priority()).isEqualTo(3);
    }

    @Test
    void avalancheOrdersByComparableRateDescending() {
        OffsetDateTime t1 = OffsetDateTime.now().minusDays(10);
        OffsetDateTime t2 = OffsetDateTime.now().minusDays(5);

        // 24% NAMV = 26.82% EA
        Debt d1 = createDebt("NAMV 24%", new BigDecimal("5000000"), new BigDecimal("24.0"), RateType.NAMV, new BigDecimal("200000"), null, t1);
        // 26% EA
        Debt d2 = createDebt("EA 26%", new BigDecimal("2000000"), new BigDecimal("26.0"), RateType.EA, new BigDecimal("150000"), null, t2);
        // Sin intereses (0% EA)
        Debt d3 = createDebt("NONE 0%", new BigDecimal("1000000"), BigDecimal.ZERO, RateType.NONE, new BigDecimal("100000"), null, t1);

        StrategyResponse response = engine.execute(List.of(d1, d2, d3), StrategyType.AVALANCHE, UserPlan.PLUS, new BigDecimal("600000"));

        assertThat(response.status()).isEqualTo("SUCCESS");
        assertThat(response.orderedDebts()).hasSize(3);
        // 26.82% EA > 26% EA > 0% EA
        assertThat(response.orderedDebts().get(0).name()).isEqualTo("NAMV 24%");
        assertThat(response.orderedDebts().get(0).priority()).isEqualTo(1);
        assertThat(response.orderedDebts().get(1).name()).isEqualTo("EA 26%");
        assertThat(response.orderedDebts().get(1).priority()).isEqualTo(2);
        assertThat(response.orderedDebts().get(2).name()).isEqualTo("NONE 0%");
        assertThat(response.orderedDebts().get(2).priority()).isEqualTo(3);
    }

    @Test
    void avalancheTieBreakerUsesCreatedAtAndIdNotBalance() {
        OffsetDateTime t1 = OffsetDateTime.now().minusDays(10);
        OffsetDateTime t2 = OffsetDateTime.now().minusDays(5);

        Debt d1 = createDebt("D1 25%", new BigDecimal("5000000"), new BigDecimal("25.0"), RateType.EA, new BigDecimal("200000"), null, t1);
        Debt d2 = createDebt("D2 25%", new BigDecimal("1000000"), new BigDecimal("25.0"), RateType.EA, new BigDecimal("100000"), null, t2);

        StrategyResponse response = engine.execute(List.of(d1, d2), StrategyType.AVALANCHE, UserPlan.PLUS, new BigDecimal("500000"));

        assertThat(response.orderedDebts()).hasSize(2);
        assertThat(response.orderedDebts().get(0).name()).isEqualTo("D1 25%");
        assertThat(response.orderedDebts().get(0).priority()).isEqualTo(1);
        assertThat(response.orderedDebts().get(1).name()).isEqualTo("D2 25%");
        assertThat(response.orderedDebts().get(1).priority()).isEqualTo(2);
    }

    @Test
    void avalancheMarksNonComparableRatesAsInsufficientData() {
        Debt d1 = createDebt("Fija 20%", new BigDecimal("3000000"), new BigDecimal("20.0"), RateType.EA, new BigDecimal("150000"), null, null);
        Debt d2 = createDebt("Indexada IBR", new BigDecimal("2000000"), new BigDecimal("5.0"), RateType.IBR_MARGIN, new BigDecimal("100000"), null, null);

        StrategyResponse response = engine.execute(List.of(d1, d2), StrategyType.AVALANCHE, UserPlan.PLUS, new BigDecimal("400000"));

        assertThat(response.status()).isEqualTo("INSUFFICIENT_DATA");
        assertThat(response.hasNonComparableDebts()).isTrue();
        assertThat(response.statusReason()).contains("tasa indexada o no disponible");
        // Non-comparable debts do not get arbitrary priority numbers
        assertThat(response.orderedDebts().get(0).priority()).isNull();
        assertThat(response.orderedDebts().get(1).priority()).isNull();
    }

    @Test
    void planCeroConsidersMaximumTwoDebtsAndHidesAdvancedDetails() {
        Debt d1 = createDebt("D1", new BigDecimal("1000000"), new BigDecimal("20.0"), RateType.EA, new BigDecimal("100000"), null, null);
        Debt d2 = createDebt("D2", new BigDecimal("2000000"), new BigDecimal("22.0"), RateType.EA, new BigDecimal("150000"), null, null);
        Debt d3 = createDebt("D3", new BigDecimal("3000000"), new BigDecimal("25.0"), RateType.EA, new BigDecimal("200000"), null, null);

        StrategyResponse response = engine.execute(List.of(d1, d2, d3), StrategyType.SNOWBALL, UserPlan.CERO, new BigDecimal("400000"));

        assertThat(response.plan()).isEqualTo(UserPlan.CERO);
        assertThat(response.consideredDebtsCount()).isEqualTo(2);
        assertThat(response.totalActiveDebtsCount()).isEqualTo(3);
        assertThat(response.orderedDebts()).hasSize(2);

        // CA-06: No advance metrics for Cero
        StrategyResponse.StrategyDebtDto item = response.orderedDebts().get(0);
        assertThat(item.projectedInterest()).isNull();
        assertThat(item.projectedPrincipal()).isNull();
        assertThat(item.estimatedPayoffDate()).isNull();
        assertThat(item.estimatedMonths()).isNull();
        assertThat(item.extraPayment()).isNull();
        assertThat(response.globalProjection()).isNull();
        assertThat(response.comparison()).isNull();

        // But summary projection is available
        assertThat(response.summaryProjection()).isNotNull();
        assertThat(response.summaryProjection().available()).isTrue();
    }

    @Test
    void planPlusIncludesAllDebtsAdvancedProjectionsAndComparison() {
        Debt d1 = createDebt("D1", new BigDecimal("1000000"), new BigDecimal("20.0"), RateType.EA, new BigDecimal("100000"), null, null);
        Debt d2 = createDebt("D2", new BigDecimal("2000000"), new BigDecimal("22.0"), RateType.EA, new BigDecimal("150000"), null, null);
        Debt d3 = createDebt("D3", new BigDecimal("3000000"), new BigDecimal("25.0"), RateType.EA, new BigDecimal("200000"), null, null);

        StrategyResponse response = engine.execute(List.of(d1, d2, d3), StrategyType.SNOWBALL, UserPlan.PLUS, new BigDecimal("600000"));

        assertThat(response.plan()).isEqualTo(UserPlan.PLUS);
        assertThat(response.consideredDebtsCount()).isEqualTo(3);
        assertThat(response.orderedDebts()).hasSize(3);

        StrategyResponse.StrategyDebtDto p1 = response.orderedDebts().get(0);
        assertThat(p1.projectedInterest()).isNotNull();
        assertThat(p1.projectedPrincipal()).isNotNull();
        assertThat(p1.estimatedPayoffDate()).isNotNull();
        assertThat(p1.extraPayment()).isNotNull();
        assertThat(p1.extraPayment()).isGreaterThan(BigDecimal.ZERO);

        assertThat(response.globalProjection()).isNotNull();
        assertThat(response.globalProjection().available()).isTrue();

        assertThat(response.comparison()).isNotNull();
        assertThat(response.comparison().available()).isTrue();
        assertThat(response.comparison().snowball()).isNotNull();
        assertThat(response.comparison().avalanche()).isNotNull();
    }

    @Test
    void distributesExtraPaymentOnlyToPriorityOne() {
        Debt d1 = createDebt("D1", new BigDecimal("1000000"), new BigDecimal("20.0"), RateType.EA, new BigDecimal("100000"), null, null);
        Debt d2 = createDebt("D2", new BigDecimal("3000000"), new BigDecimal("20.0"), RateType.EA, new BigDecimal("200000"), null, null);

        // Required total = 300.000. Configured budget = 500.000. Extra capacity = 200.000
        StrategyResponse response = engine.execute(List.of(d1, d2), StrategyType.SNOWBALL, UserPlan.PLUS, new BigDecimal("500000"));

        StrategyResponse.StrategyDebtDto p1 = response.orderedDebts().get(0);
        StrategyResponse.StrategyDebtDto p2 = response.orderedDebts().get(1);

        assertThat(p1.basePayment()).isEqualByComparingTo(new BigDecimal("100000"));
        assertThat(p1.extraPayment()).isEqualByComparingTo(new BigDecimal("200000"));
        assertThat(p1.recommendedPayment()).isEqualByComparingTo(new BigDecimal("300000"));

        assertThat(p2.basePayment()).isEqualByComparingTo(new BigDecimal("200000"));
        assertThat(p2.extraPayment()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(p2.recommendedPayment()).isEqualByComparingTo(new BigDecimal("200000"));
    }
}
