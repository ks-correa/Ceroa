CREATE TABLE plus_subscriptions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(30) NOT NULL CHECK (provider = 'MERCADO_PAGO'),
    periodicity VARCHAR(10) NOT NULL CHECK (periodicity IN ('MONTHLY','YEARLY')),
    status VARCHAR(12) NOT NULL CHECK (status IN ('PENDING','ACTIVE','REJECTED','CANCELLED','ERROR')),
    provider_id VARCHAR(100) UNIQUE,
    checkout_url VARCHAR(1000),
    amount NUMERIC(19,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL,
    automatic_renewal BOOLEAN NOT NULL DEFAULT TRUE,
    started_at TIMESTAMPTZ,
    next_payment_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_plus_subscriptions_user ON plus_subscriptions(user_id, created_at DESC);
CREATE UNIQUE INDEX uq_plus_subscription_open ON plus_subscriptions(user_id) WHERE status IN ('PENDING','ACTIVE');
