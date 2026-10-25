-- Consent is tied to the current Telegram binding and disappears on unlink.
ALTER TABLE telegram_links ADD COLUMN document_consent_at TIMESTAMPTZ;
