CREATE TABLE financial_document_versions (
 document_id UUID NOT NULL REFERENCES financial_documents(id) ON DELETE CASCADE,
 document_version INTEGER NOT NULL CHECK(document_version>0),
 storage_path VARCHAR(250) NOT NULL UNIQUE, content_hash CHAR(64) NOT NULL,
 content_type VARCHAR(150) NOT NULL, metadata_snapshot JSONB NOT NULL,
 archived_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(document_id,document_version)
);
ALTER TABLE financial_document_versions ENABLE ROW LEVEL SECURITY;

-- Only non-personal index configuration is exposed through the backend's allowlisted PostgREST gateway.
-- Native n8n Supabase nodes use a gateway credential, never the project's service_role key.
CREATE TABLE public.ceroa_rag_configuration (
 id TEXT PRIMARY KEY, embedding_model TEXT NOT NULL, dimensions INTEGER NOT NULL,
 schema_version INTEGER NOT NULL, max_file_bytes INTEGER NOT NULL, max_pages INTEGER NOT NULL,
 ocr_model TEXT NOT NULL
);
INSERT INTO public.ceroa_rag_configuration VALUES
 ('financial-library-v1','gemini-embedding-001',768,21,8388608,25,'gemini-3.5-flash-lite');
ALTER TABLE public.ceroa_rag_configuration ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ceroa_rag_configuration FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN
  GRANT SELECT ON public.ceroa_rag_configuration TO service_role;
 END IF;
END $$;
NOTIFY pgrst, 'reload schema';
