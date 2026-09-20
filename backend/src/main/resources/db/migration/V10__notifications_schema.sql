-- V10: Esquema para Centro de Notificaciones y Eventos (EP-12)
CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message VARCHAR(1000) NOT NULL,
    event_date DATE NOT NULL,
    related_debt_id UUID REFERENCES debts(id) ON DELETE SET NULL,
    related_debt_name VARCHAR(160),
    read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    channel VARCHAR(40) NOT NULL DEFAULT 'IN_APP',
    event_key VARCHAR(160),
    plan_restricted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX idx_notifications_user_event_key ON notifications(user_id, event_key);
CREATE INDEX idx_notifications_related_debt_id ON notifications(related_debt_id);

