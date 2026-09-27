CREATE TABLE automation_tokens (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(80) NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    allow_writes BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ
);
CREATE INDEX idx_automation_tokens_user ON automation_tokens(user_id);

-- Retry results are committed atomically with the financial mutation.
CREATE TABLE automation_requests (
    id UUID PRIMARY KEY,
    token_id UUID NOT NULL REFERENCES automation_tokens(id) ON DELETE CASCADE,
    request_key UUID NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    response_json TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    UNIQUE (token_id, request_key)
);
