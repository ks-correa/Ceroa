CREATE TABLE sentinel_states (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    financial_version BIGINT NOT NULL DEFAULT 0,
    dirty BOOLEAN NOT NULL DEFAULT TRUE,
    condition VARCHAR(24) NOT NULL DEFAULT 'UNKNOWN',
    episode_id UUID,
    evaluated_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE TABLE sentinel_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    telegram_alerts BOOLEAN NOT NULL DEFAULT FALSE,
    consent_linked_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE TABLE sentinel_alerts (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    episode_id UUID NOT NULL,
    notification_id UUID NOT NULL REFERENCES notifications(id),
    financial_version BIGINT NOT NULL,
    budget NUMERIC(19,2) NOT NULL,
    required_payments NUMERIC(19,2) NOT NULL,
    shortfall NUMERIC(19,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    delivery_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    delivery_attempts INTEGER NOT NULL DEFAULT 0,
    next_attempt TIMESTAMP WITH TIME ZONE NOT NULL,
    delivery_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    lease_hash VARCHAR(64),
    lease_expires_at TIMESTAMP WITH TIME ZONE,
    validated_at TIMESTAMP WITH TIME ZONE,
    linked_at TIMESTAMP WITH TIME ZONE,
    chat_id BIGINT,
    telegram_message_id BIGINT,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivery_error VARCHAR(40),
    UNIQUE(user_id,episode_id)
);
CREATE INDEX sentinel_alerts_user_created_idx ON sentinel_alerts(user_id,created_at);
CREATE INDEX sentinel_alerts_pending_idx ON sentinel_alerts(delivery_status,next_attempt);
CREATE TABLE sentinel_approvals (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    alert_id UUID NOT NULL REFERENCES sentinel_alerts(id),
    debt_id UUID NOT NULL,
    strategy VARCHAR(20) NOT NULL,
    action VARCHAR(24) NOT NULL DEFAULT 'GENERATE_SIMULATION',
    financial_version BIGINT NOT NULL,
    issued_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL,
    result_status VARCHAR(30),
    result_reason VARCHAR(1000),
    result_assumptions VARCHAR(2000),
    projected_months INTEGER,
    projected_interest NUMERIC(19,2),
    CHECK(action='GENERATE_SIMULATION'),
    CHECK(status IN ('PENDING','DISCARDED','EXPIRED','INVALIDATED','EXECUTING','COMPLETED','FAILED'))
);
CREATE INDEX sentinel_approval_owner_idx ON sentinel_approvals(user_id,issued_at);
