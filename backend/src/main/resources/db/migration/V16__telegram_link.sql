CREATE TABLE telegram_links (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    sender_id BIGINT UNIQUE,
    chat_id BIGINT UNIQUE,
    code_hash VARCHAR(64) UNIQUE,
    code_expires_at TIMESTAMP WITH TIME ZONE,
    linked_at TIMESTAMP WITH TIME ZONE,
    CHECK ((sender_id IS NULL AND chat_id IS NULL AND linked_at IS NULL) OR (sender_id = chat_id AND sender_id > 0 AND linked_at IS NOT NULL))
);
CREATE TABLE telegram_receipts (
    id BIGINT PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX telegram_receipt_created_idx ON telegram_receipts(created_at);
