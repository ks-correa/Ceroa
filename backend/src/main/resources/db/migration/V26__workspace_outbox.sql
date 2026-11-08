CREATE TABLE integration_events (
 id UUID PRIMARY KEY, revision BIGINT NOT NULL DEFAULT 0,
 dedupe_key VARCHAR(200) NOT NULL UNIQUE,
 channel VARCHAR(20) NOT NULL CHECK(channel IN ('GMAIL','SHEETS','CALENDAR','DRIVE')),
 kind VARCHAR(40) NOT NULL, owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
 recipient VARCHAR(254), payload TEXT NOT NULL,
 status VARCHAR(24) NOT NULL CHECK(status IN ('PENDING','LEASED','DISPATCHING','ACKNOWLEDGED','AMBIGUOUS','DEAD','CANCELLED')),
 attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5),
 next_attempt_at TIMESTAMPTZ NOT NULL, lease_until TIMESTAMPTZ, lease_token UUID,
 provider_id VARCHAR(200), error_code VARCHAR(50),
 created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX integration_events_dispatch ON integration_events(channel,status,next_attempt_at,created_at);
CREATE INDEX integration_events_owner ON integration_events(owner_id,created_at);
