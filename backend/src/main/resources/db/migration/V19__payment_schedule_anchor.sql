ALTER TABLE debts ADD COLUMN payment_schedule_anchor DATE;
ALTER TABLE debts ADD COLUMN payment_schedule_reset_at TIMESTAMP WITH TIME ZONE;
