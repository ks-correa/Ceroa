ALTER TABLE users ADD COLUMN document_id VARCHAR(50);

CREATE UNIQUE INDEX uq_users_document_id
    ON users(document_id)
    WHERE document_id IS NOT NULL;
