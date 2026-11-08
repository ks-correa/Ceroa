CREATE TABLE workspace_actions (
 id UUID PRIMARY KEY, owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 kind VARCHAR(40) NOT NULL, confirmation_code VARCHAR(24) NOT NULL UNIQUE,
 status VARCHAR(20) NOT NULL CHECK(status IN ('PROPOSED','CONFIRMED','EXPIRED','CANCELLED')),
 expires_at TIMESTAMPTZ NOT NULL, event_id UUID REFERENCES integration_events(id),
 created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX workspace_actions_owner ON workspace_actions(owner_id,status,expires_at);
