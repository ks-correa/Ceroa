-- Derived documentary evidence, never registered debts or payments.
CREATE TABLE document_financial_facts (
 id UUID PRIMARY KEY,
 document_id UUID NOT NULL REFERENCES financial_documents(id) ON DELETE CASCADE,
 document_version INTEGER NOT NULL CHECK(document_version > 0),
 chunk_id UUID NOT NULL REFERENCES document_chunks(id) ON DELETE CASCADE,
 kind VARCHAR(32) NOT NULL,
 value_type VARCHAR(12) NOT NULL CHECK(value_type IN ('NUMBER','DATE','TEXT')),
 numeric_value NUMERIC(30,8), date_value DATE, text_value VARCHAR(200),
 unit VARCHAR(20) NOT NULL, currency CHAR(3), rate_mode VARCHAR(24),
 transaction_reference VARCHAR(80), effective_date DATE,
 validation_status VARCHAR(20) NOT NULL CHECK(validation_status IN ('VERIFIED','NEEDS_REVIEW')),
 quote VARCHAR(2000) NOT NULL, quote_start INTEGER NOT NULL CHECK(quote_start >= 0),
 quote_end INTEGER NOT NULL CHECK(quote_end > quote_start),
 fingerprint CHAR(64) NOT NULL, extractor_version INTEGER NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(document_id,document_version,fingerprint),
 CHECK((value_type='NUMBER' AND date_value IS NULL AND text_value IS NULL)
    OR (value_type='DATE' AND numeric_value IS NULL AND text_value IS NULL AND date_value IS NOT NULL)
    OR (value_type='TEXT' AND numeric_value IS NULL AND date_value IS NULL AND text_value IS NOT NULL)),
 CHECK(validation_status<>'VERIFIED' OR value_type<>'NUMBER' OR numeric_value IS NOT NULL)
);
CREATE INDEX document_facts_scope ON document_financial_facts(document_id,document_version,kind);
ALTER TABLE document_financial_facts ENABLE ROW LEVEL SECURITY;
-- No browser-facing policies: access remains through backend authorization.
