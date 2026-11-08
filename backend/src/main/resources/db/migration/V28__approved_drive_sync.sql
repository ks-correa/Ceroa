CREATE TABLE approved_drive_sources (
 id UUID PRIMARY KEY, owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 folder_id VARCHAR(200) NOT NULL, active BOOLEAN NOT NULL DEFAULT false,
 approved_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE drive_sync_files (
 id UUID PRIMARY KEY, source_id UUID NOT NULL REFERENCES approved_drive_sources(id) ON DELETE CASCADE,
 file_id VARCHAR(200) NOT NULL, last_version VARCHAR(30), last_checksum VARCHAR(32),
 pending_version VARCHAR(30), pending_checksum VARCHAR(32), file_name VARCHAR(255), mime_type VARCHAR(100),
 document_id UUID REFERENCES financial_documents(id) ON DELETE SET NULL, document_version INTEGER,
 status VARCHAR(24) NOT NULL, lease_token UUID, lease_until TIMESTAMPTZ, updated_at TIMESTAMPTZ NOT NULL,
 UNIQUE(source_id,file_id)
);
