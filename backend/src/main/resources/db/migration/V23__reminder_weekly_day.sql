ALTER TABLE reminder_preferences ADD COLUMN weekly_day INTEGER NOT NULL DEFAULT 1 CHECK (weekly_day BETWEEN 1 AND 7);
