package com.ceroa.service;

import com.ceroa.domain.User;
import com.ceroa.domain.UserPlan;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class MonthlyProgressServiceTest {
    @Test void comparesConfirmedPeriodsWithoutMutatingHistory() {
        var history = mock(MonthlyHistoryService.class);
        var current = mock(CurrentUserService.class);
        var plans = mock(PlanAccessService.class);
        var user = new User(); user.setId(UUID.randomUUID()); user.setPlan(UserPlan.PLUS);
        when(current.entity()).thenReturn(user);
        when(plans.access(user)).thenReturn(new PlanAccessService.PlanAccess(UserPlan.PLUS, true,
                new PlanAccessService.Capabilities(true,true,true,true,true,true,true),
                new PlanAccessService.Limits(null,"FULL","DETAILED")));
        when(history.rows(eq(user.getId()), any())).thenReturn(List.of(
                new MonthlyHistoryService.HistoryRow(Instant.parse("2026-07-20T12:00:00Z"), new BigDecimal("100.00"), null, null, null),
                new MonthlyHistoryService.HistoryRow(Instant.parse("2026-08-10T12:00:00Z"), new BigDecimal("80.00"), new BigDecimal("20.00"), 1, 0),
                new MonthlyHistoryService.HistoryRow(Instant.parse("2026-09-10T12:00:00Z"), new BigDecimal("70.00"), new BigDecimal("10.00"), 1, 0)));
        var response = new MonthlyProgressService(history, current, plans).get(2026, 9);
        assertThat(response.status()).isEqualTo("SUCCESS");
        assertThat(response.openingDebt()).isEqualByComparingTo("80.00");
        assertThat(response.closingDebt()).isEqualByComparingTo("70.00");
        assertThat(response.totalPaid()).isEqualByComparingTo("10.00");
        assertThat(response.comparison().totalPaidChange()).isEqualByComparingTo("-10.00");
        assertThat(response.principalReduced()).isNull();
        verify(history).rows(eq(user.getId()), any());
    }

    @Test void marksUnobservedPastInsufficientAndFiltersBasicDetails() {
        var history = mock(MonthlyHistoryService.class);
        var current = mock(CurrentUserService.class);
        var plans = mock(PlanAccessService.class);
        var user = new User(); user.setId(UUID.randomUUID()); user.setPlan(UserPlan.CERO);
        when(current.entity()).thenReturn(user);
        when(plans.access(user)).thenReturn(new PlanAccessService.PlanAccess(UserPlan.CERO, false,
                new PlanAccessService.Capabilities(true,true,true,false,false,false,false),
                new PlanAccessService.Limits(2,"BASIC","BASIC")));
        when(history.rows(eq(user.getId()), any())).thenReturn(List.of(
                new MonthlyHistoryService.HistoryRow(Instant.parse("2026-08-10T12:00:00Z"), new BigDecimal("80.00"), null, null, null)));
        var response = new MonthlyProgressService(history, current, plans).get(2026, 8);
        assertThat(response.status()).isEqualTo("INSUFFICIENT_DATA");
        assertThat(response.detailLevel()).isEqualTo("BASIC");
        assertThat(response.registeredPaymentsCount()).isNull();
        assertThat(response.openingDebt()).isNull();
    }
}
