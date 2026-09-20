ALTER TABLE plus_subscriptions ADD COLUMN access_until TIMESTAMPTZ;
ALTER TABLE plus_subscriptions ADD COLUMN cancel_requested_at TIMESTAMPTZ;
ALTER TABLE plus_subscriptions ADD COLUMN cancellation_confirmed_at TIMESTAMPTZ;
ALTER TABLE plus_subscriptions ALTER COLUMN status TYPE VARCHAR(20);
ALTER TABLE plus_subscriptions DROP CONSTRAINT IF EXISTS plus_subscriptions_status_check;
ALTER TABLE plus_subscriptions ADD CONSTRAINT plus_subscriptions_status_check
    CHECK (status IN ('PENDING','ACTIVE','CANCEL_PENDING','CANCEL_SCHEDULED','EXPIRED','REJECTED','CANCELLED','ERROR'));
DROP INDEX uq_plus_subscription_open;
CREATE UNIQUE INDEX uq_plus_subscription_open ON plus_subscriptions(user_id)
    WHERE status IN ('PENDING','ACTIVE','CANCEL_PENDING','CANCEL_SCHEDULED');
