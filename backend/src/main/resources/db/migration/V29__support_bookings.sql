CREATE TABLE support_bookings (
 id UUID PRIMARY KEY,owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 code VARCHAR(20) NOT NULL UNIQUE,slot_start TIMESTAMPTZ NOT NULL,slot_end TIMESTAMPTZ NOT NULL,
 expires_at TIMESTAMPTZ NOT NULL,status VARCHAR(32) NOT NULL,active_slot VARCHAR(100) UNIQUE,
 provider_id VARCHAR(100),meet_url VARCHAR(200),cancel_code VARCHAR(20),cancel_expires_at TIMESTAMPTZ,
 revision BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX support_bookings_owner ON support_bookings(owner_id);
