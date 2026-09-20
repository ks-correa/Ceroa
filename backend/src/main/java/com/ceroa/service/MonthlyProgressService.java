package com.ceroa.service;

import com.ceroa.api.dto.MonthlyProgressResponse;
import com.ceroa.exception.BusinessRuleException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.List;

@Service
public class MonthlyProgressService {
    private static final ZoneId ZONE = ZoneId.of("America/Bogota");
    private final MonthlyHistoryService history;
    private final CurrentUserService currentUser;
    private final PlanAccessService plans;

    public MonthlyProgressService(MonthlyHistoryService history, CurrentUserService currentUser, PlanAccessService plans) {
        this.history = history;
        this.currentUser = currentUser;
        this.plans = plans;
    }

    @Transactional(readOnly = true)
    public MonthlyProgressResponse get(int year, int month) {
        if (year < 2000 || year > 9999 || month < 1 || month > 12) {
            throw new BusinessRuleException("INVALID_MONTH", "Selecciona un mes y año válidos.");
        }
        YearMonth selected = YearMonth.of(year, month);
        if (selected.isAfter(YearMonth.now(ZONE))) {
            throw new BusinessRuleException("FUTURE_MONTH", "No hay progreso para un mes futuro.");
        }
        var user = currentUser.entity();
        boolean full = plans.access(user).capabilities().detailedMonthlySummary();
        List<MonthlyHistoryService.HistoryRow> rows = history.rows(user.getId(), end(selected));
        Period current = calculate(selected, rows);
        Period previous = calculate(selected.minusMonths(1), rows);
        MonthlyProgressResponse.Comparison comparison = previous.status.equals("SUCCESS") && current.status.equals("SUCCESS")
                ? new MonthlyProgressResponse.Comparison(selected.minusMonths(1).getYear(), selected.minusMonths(1).getMonthValue(), "SUCCESS",
                    current.closing.subtract(previous.closing), current.paid.subtract(previous.paid),
                    null,
                    full ? current.count - previous.count : null, full ? current.closed - previous.closed : null)
                : new MonthlyProgressResponse.Comparison(selected.minusMonths(1).getYear(), selected.minusMonths(1).getMonthValue(),
                    previous.status, null, null, null, null, null);
        return new MonthlyProgressResponse(year, month, current.status, full ? "FULL" : "BASIC",
                current.opening, current.closing, current.paid,
                null, null, null, null,
                full ? current.count : null, full ? current.closed : null, comparison);
    }

    private Period calculate(YearMonth period, List<MonthlyHistoryService.HistoryRow> rows) {
        Instant start = period.atDay(1).atStartOfDay(ZONE).toInstant();
        Instant end = end(period);
        MonthlyHistoryService.HistoryRow opening = null;
        MonthlyHistoryService.HistoryRow closing = null;
        BigDecimal paid = BigDecimal.ZERO;
        int count = 0, closed = 0;
        for (var row : rows) {
            if (row.time().isBefore(start)) opening = row;
            if (row.time().isBefore(end)) closing = row;
            if (!row.time().isBefore(start) && row.time().isBefore(end)) {
                if (row.paymentDelta() != null) paid = paid.add(row.paymentDelta());
                if (row.paymentCountDelta() != null) count += row.paymentCountDelta();
                if (row.closedDebtDelta() != null) closed += row.closedDebtDelta();
            }
        }
        if (opening == null) return new Period(rows.isEmpty() ? "EMPTY" : "INSUFFICIENT_DATA", null, null, null, 0, 0);
        if (closing == null) return new Period("INSUFFICIENT_DATA", null, null, null, 0, 0);
        return new Period("SUCCESS", opening.balance(), closing.balance(), paid, count, closed);
    }

    private Instant end(YearMonth period) {
        return period.plusMonths(1).atDay(1).atStartOfDay(ZONE).toInstant();
    }

    private record Period(String status, BigDecimal opening, BigDecimal closing, BigDecimal paid,
                          int count, int closed) {}
}
