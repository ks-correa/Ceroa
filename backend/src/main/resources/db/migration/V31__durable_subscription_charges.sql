CREATE TABLE subscription_charges (
 id VARCHAR(160) PRIMARY KEY,
 subscription_id UUID NOT NULL REFERENCES plus_subscriptions(id) ON DELETE CASCADE,
 billing_boundary TIMESTAMPTZ,
 observed_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX subscription_charges_subscription ON subscription_charges(subscription_id);
