package com.ceroa.service;

import com.ceroa.domain.Debt;
import com.ceroa.repository.DebtRepository;
import jakarta.persistence.EntityManager;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class MonthlyHistoryService {
    private final JdbcTemplate jdbc;
    private final DebtRepository debts;
    private final EntityManager entityManager;

    public MonthlyHistoryService(JdbcTemplate jdbc, DebtRepository debts, EntityManager entityManager) {
        this.jdbc = jdbc;
        this.debts = debts;
        this.entityManager = entityManager;
    }

    public void observe(UUID userId, BigDecimal paymentDelta, Integer paymentCountDelta, Integer closedDebtDelta) {
        entityManager.flush();
        BigDecimal balance = debts.findAllByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(Debt::getCurrentBalance).reduce(BigDecimal.ZERO, BigDecimal::add);
        jdbc.update("INSERT INTO monthly_balance_history(id,user_id,recorded_at,balance,payment_delta,payment_count_delta,closed_debt_delta) VALUES (?,?,?,?,?,?,?)",
                UUID.randomUUID(), userId, Timestamp.from(Instant.now()), balance, paymentDelta, paymentCountDelta, closedDebtDelta);
    }

    public void baseline(UUID userId) {
        Integer count = jdbc.queryForObject("SELECT count(*) FROM monthly_balance_history WHERE user_id=?", Integer.class, userId);
        if (count == null || count == 0) observe(userId, null, null, null);
    }

    public List<HistoryRow> rows(UUID userId, Instant before) {
        return jdbc.query("SELECT recorded_at,balance,payment_delta,payment_count_delta,closed_debt_delta FROM monthly_balance_history WHERE user_id=? AND recorded_at<? ORDER BY recorded_at,id",
                (rs, n) -> new HistoryRow(rs.getTimestamp(1).toInstant(), rs.getBigDecimal(2), rs.getBigDecimal(3),
                        (Integer) rs.getObject(4), (Integer) rs.getObject(5)), userId, Timestamp.from(before));
    }

    public record HistoryRow(Instant time, BigDecimal balance, BigDecimal paymentDelta,
                             Integer paymentCountDelta, Integer closedDebtDelta) {}
}
