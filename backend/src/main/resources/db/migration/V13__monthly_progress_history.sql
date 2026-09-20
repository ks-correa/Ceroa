CREATE TABLE monthly_balance_history (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recorded_at timestamptz NOT NULL,
    balance numeric(19,2) NOT NULL,
    payment_delta numeric(19,2),
    payment_count_delta integer,
    closed_debt_delta integer
);
CREATE INDEX idx_monthly_balance_history_user_time ON monthly_balance_history(user_id, recorded_at, id);
