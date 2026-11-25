package com.ceroa.service;

import com.ceroa.api.dto.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.util.List;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class AssistantFinancialSummaryTest {
    DashboardService dashboard=mock(DashboardService.class);
    FinancialProfileService profile=mock(FinancialProfileService.class);
    AssistantAnalysisService analysis=new AssistantAnalysisService(new ObjectMapper(),null,null,null,dashboard,profile,null,null,null);
    void given(BigDecimal income,BigDecimal payments,boolean partial){
        when(dashboard.getSummary()).thenReturn(new DashboardSummaryResponse(new BigDecimal("108600000"),3,payments,payments!=null,null,List.of(),new BigDecimal("1000000"),null,null,null,false,3,3L,partial,"COMPLETE"));
        when(profile.get()).thenReturn(new FinancialProfileResponse(income,BigDecimal.ZERO,new BigDecimal("1000000"),new BigDecimal("1000000"),0,3,3L,false,null));
    }
    @Test void percentageUsesMonthlyRequiredPaymentsRatherThanTotalBalance(){
        given(new BigDecimal("4000000"),new BigDecimal("1500000"),false);
        var data=analysis.read(AssistantAnalysisService.Dataset.summary,2026,11,0);
        assertEquals(0,new BigDecimal("37.50").compareTo(data.path("monthlyDebtServicePercent").decimalValue()));
        assertEquals("AVAILABLE",data.path("debtServiceStatus").asText());
        verify(dashboard,times(1)).getSummary();verify(profile,times(1)).get();
    }
    @Test void zeroIncomeMissingPaymentsAndPartialCoverageDoNotProducePercentages(){
        given(BigDecimal.ZERO,new BigDecimal("1500000"),false);
        var zero=analysis.read(AssistantAnalysisService.Dataset.summary,2026,11,0);
        assertTrue(zero.path("monthlyDebtServicePercent").isNull());assertTrue(zero.path("debtServiceReason").asText().contains("ingresos"));
        given(new BigDecimal("4000000"),null,false);
        assertTrue(analysis.read(AssistantAnalysisService.Dataset.summary,2026,11,0).path("monthlyDebtServicePercent").isNull());
        given(new BigDecimal("4000000"),new BigDecimal("1500000"),true);
        assertEquals("INSUFFICIENT_DATA",analysis.read(AssistantAnalysisService.Dataset.summary,2026,11,0).path("debtServiceStatus").asText());
    }
    @Test void valuesAboveFullIncomeAreNotCappedOrConfusedWithAssignedBudget(){
        given(new BigDecimal("1000000"),new BigDecimal("1500000"),false);
        assertEquals(0,new BigDecimal("150").compareTo(analysis.read(AssistantAnalysisService.Dataset.summary,2026,11,0).path("monthlyDebtServicePercent").decimalValue()));
    }
}
