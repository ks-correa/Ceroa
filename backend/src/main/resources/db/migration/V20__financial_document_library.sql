-- Requires pgvector installed in schema extensions (see docs/HYBRID_RAG.md).
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

CREATE TABLE financial_documents (
 id UUID PRIMARY KEY, owner_id UUID NOT NULL REFERENCES users(id),
 identification_type VARCHAR(8) CHECK (identification_type IN ('CC','CE','TI','NIT','PASSPORT','OTHER')),
 document_type VARCHAR(32) NOT NULL, financial_entity VARCHAR(160),
 period_start DATE, period_end DATE, issued_at DATE,
 uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 debt_id UUID REFERENCES debts(id), source_type VARCHAR(32) NOT NULL DEFAULT 'MANUAL',
 storage_path VARCHAR(250) NOT NULL UNIQUE, content_type VARCHAR(150) NOT NULL,
 processing_status VARCHAR(24) NOT NULL CHECK (processing_status IN ('PENDING','PROCESSING','REVIEW_REQUIRED','INDEXED','FAILED','DELETING')),
 document_version INTEGER NOT NULL DEFAULT 1 CHECK (document_version > 0),
 content_hash CHAR(64) NOT NULL, metadata JSONB NOT NULL DEFAULT '{}',
 UNIQUE(owner_id,content_hash),
 CHECK (period_end IS NULL OR period_start IS NULL OR period_end > period_start)
);
CREATE INDEX financial_documents_filters ON financial_documents(owner_id,identification_type,document_type,period_start,period_end);
-- An administrative role alone confers no cross-account access. Each scope is explicitly granted.
CREATE TABLE document_access_grants (
 actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 permission VARCHAR(24) NOT NULL CHECK (permission IN ('DOCUMENT_READ','DOCUMENT_MANAGE')),
 expires_at TIMESTAMPTZ NOT NULL, PRIMARY KEY(actor_id,owner_id,permission)
);
CREATE TABLE document_processing_jobs (
 id UUID PRIMARY KEY, document_id UUID NOT NULL REFERENCES financial_documents(id) ON DELETE CASCADE,
 document_version INTEGER NOT NULL, status VARCHAR(24) NOT NULL,
 attempts INTEGER NOT NULL DEFAULT 0, lease_until TIMESTAMPTZ,
 error_code VARCHAR(40), payload JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(document_id,document_version)
);
CREATE INDEX document_jobs_queue ON document_processing_jobs(status,lease_until,created_at);
CREATE TABLE document_chunks (
 id UUID PRIMARY KEY, document_id UUID NOT NULL REFERENCES financial_documents(id) ON DELETE CASCADE,
 chunk_order INTEGER NOT NULL CHECK(chunk_order >= 0), page INTEGER CHECK(page > 0),
 location VARCHAR(200) NOT NULL, content TEXT NOT NULL CHECK(length(content) <= 2000),
 embedding extensions.vector(768) NOT NULL, embedding_model VARCHAR(80) NOT NULL,
 document_version INTEGER NOT NULL, metadata JSONB NOT NULL DEFAULT '{}',
 search_text TSVECTOR GENERATED ALWAYS AS (to_tsvector('spanish',content)) STORED,
 UNIQUE(document_id,chunk_order)
);
CREATE INDEX document_chunks_document ON document_chunks(document_id,document_version);
CREATE INDEX document_chunks_text ON document_chunks USING gin(search_text);
-- Exact vector scan over authorized candidates: filtering precedes LIMIT. Add ANN only after measuring recall.
CREATE TABLE rag_query_audit (
 id UUID PRIMARY KEY, actor_id UUID NOT NULL REFERENCES users(id),
 intent VARCHAR(32) NOT NULL, filters JSONB NOT NULL, result_count INTEGER NOT NULL,
 elapsed_ms BIGINT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX rag_audit_actor_time ON rag_query_audit(actor_id,created_at);
CREATE TABLE document_source_connectors (
 id UUID PRIMARY KEY, owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 token_hash CHAR(64) NOT NULL UNIQUE, active BOOLEAN NOT NULL DEFAULT FALSE,
 expires_at TIMESTAMPTZ NOT NULL, source_type VARCHAR(32) NOT NULL,
 consented_at TIMESTAMPTZ NOT NULL
);
ALTER TABLE document_source_connectors ENABLE ROW LEVEL SECURITY;
-- Spring authenticates its own identities. No auth.uid() assumption and no browser access.
ALTER TABLE financial_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_query_audit ENABLE ROW LEVEL SECURITY;
-- The trusted backend connection is the migration owner. API authorization is mandatory;
-- all other roles have no policies and are denied. See deployment notes for role separation.
