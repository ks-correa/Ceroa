-- Preserve every pre-existing notification, including duplicates, for audit.
CREATE TABLE notification_duplicate_keys (
    notification_id UUID PRIMARY KEY REFERENCES notifications(id) ON DELETE CASCADE,
    original_event_key VARCHAR(160) NOT NULL,
    reconciled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO notification_duplicate_keys(notification_id, original_event_key)
SELECT id, event_key FROM (
    SELECT id, event_key, row_number() OVER (PARTITION BY user_id,event_key ORDER BY created_at,id) AS position
    FROM notifications WHERE event_key IS NOT NULL
) ranked WHERE position > 1;
UPDATE notifications SET event_key = 'ARCHIVED_DUPLICATE:' || notifications.id::text
FROM notification_duplicate_keys archived WHERE archived.notification_id=notifications.id;
ALTER TABLE notifications ADD CONSTRAINT uq_notifications_user_event UNIQUE(user_id,event_key);

CREATE TABLE reminder_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    reminders BOOLEAN NOT NULL DEFAULT FALSE,
    briefing BOOLEAN NOT NULL DEFAULT FALSE,
    cadence VARCHAR(10) NOT NULL DEFAULT 'WEEKLY',
    delivery_hour INTEGER NOT NULL DEFAULT 8 CHECK(delivery_hour BETWEEN 0 AND 23),
    consent_linked_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CHECK(cadence IN ('WEEKLY','MONTHLY'))
);
CREATE TABLE scheduled_deliveries (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_id UUID NOT NULL REFERENCES notifications(id),
    event_key VARCHAR(160) NOT NULL,
    kind VARCHAR(12) NOT NULL,
    debt_id UUID,
    due_date DATE,
    milestone VARCHAR(20),
    period_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    next_attempt TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    lease_hash VARCHAR(64),
    lease_expires_at TIMESTAMP WITH TIME ZONE,
    validated_at TIMESTAMP WITH TIME ZONE,
    linked_at TIMESTAMP WITH TIME ZONE,
    chat_id BIGINT,
    message VARCHAR(3500),
    telegram_message_id BIGINT,
    sent_at TIMESTAMP WITH TIME ZONE,
    last_error VARCHAR(40),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE(user_id,event_key),
    CHECK(kind IN ('REMINDER','BRIEFING')),
    CHECK(status IN ('PENDING','RETRY','RESERVED','DISPATCHING','SENT','INVALIDATED','FAILED','AMBIGUOUS'))
);
CREATE INDEX scheduled_delivery_pending_idx ON scheduled_deliveries(status,next_attempt,created_at);
CREATE INDEX scheduled_delivery_debt_idx ON scheduled_deliveries(debt_id);
