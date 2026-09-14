ALTER TABLE users ADD COLUMN password_changed_at TIMESTAMP WITH TIME ZONE;
CREATE TABLE password_recoveries (
    id UUID PRIMARY KEY,
    email VARCHAR(254) NOT NULL,
    source_hash VARCHAR(64) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    code_hash VARCHAR(100),
    grant_hash VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    grant_expires_at TIMESTAMP WITH TIME ZONE,
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
    state VARCHAR(16) NOT NULL CHECK (state IN ('PENDING', 'SENT', 'FAILED', 'VERIFIED', 'USED'))
);
CREATE INDEX idx_recovery_email_created ON password_recoveries(email, created_at);
CREATE INDEX idx_recovery_source_created ON password_recoveries(source_hash, created_at);
CREATE INDEX idx_recovery_pending ON password_recoveries(state, created_at);
