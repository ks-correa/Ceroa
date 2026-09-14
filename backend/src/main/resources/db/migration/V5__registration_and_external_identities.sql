ALTER TABLE users ADD COLUMN initial_setup_complete BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN terms_accepted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN privacy_accepted_at TIMESTAMPTZ;
-- Preserve the configured demo account; do not infer completion from placeholder profiles.
UPDATE users SET initial_setup_complete = TRUE
WHERE id = '00000000-0000-0000-0000-000000000001';

CREATE TABLE external_identities (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('google', 'microsoft')),
    issuer VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    UNIQUE (provider, issuer, subject),
    UNIQUE (user_id, provider)
);
