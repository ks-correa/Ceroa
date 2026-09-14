package com.ceroa.api.dto;

import java.math.BigDecimal;

public record DashboardProgressResponse(
        BigDecimal totalOriginalDebt,
        BigDecimal totalPaidSoFar,
        BigDecimal totalRecordedPayments,
        Integer percentage,
        boolean hasProgressData
) {}

