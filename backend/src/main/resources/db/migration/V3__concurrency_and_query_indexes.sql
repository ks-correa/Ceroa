ALTER TABLE debts ADD COLUMN version BIGINT NOT NULL DEFAULT 0;

CREATE INDEX idx_payments_debt_date_created
    ON payments(debt_id, payment_date DESC, created_at DESC);

CREATE INDEX idx_auth_sessions_expires_at
    ON auth_sessions(expires_at);
