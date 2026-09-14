-- Extend the state CHECK constraint to support email change states
ALTER TABLE password_recoveries DROP CONSTRAINT IF EXISTS password_recoveries_state_check;
ALTER TABLE password_recoveries ADD CONSTRAINT password_recoveries_state_check
    CHECK (state IN ('PENDING','SENT','FAILED','VERIFIED','USED',
                     'PENDING_EMAIL','SENT_EMAIL','FAILED_EMAIL','VERIFIED_EMAIL','USED_EMAIL'));

-- Extend state column to accommodate longer state values
ALTER TABLE password_recoveries ALTER COLUMN state TYPE VARCHAR(20);

-- Add purpose column (PASSWORD_RESET for existing rows, EMAIL_CHANGE for new flow)
ALTER TABLE password_recoveries
    ADD COLUMN purpose VARCHAR(20) NOT NULL DEFAULT 'PASSWORD_RESET'
        CHECK (purpose IN ('PASSWORD_RESET', 'EMAIL_CHANGE'));

-- Add new_email column (null for password reset, target email for email change)
ALTER TABLE password_recoveries ADD COLUMN new_email VARCHAR(254);

-- Index to support delivery job polling by purpose and state
CREATE INDEX idx_recovery_purpose_state_created
    ON password_recoveries(purpose, state, created_at);
