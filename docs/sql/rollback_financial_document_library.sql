-- Manual DBA-only aid, never run automatically or as a production disable switch.
-- Set search_path to the intended Ceroa schema before running. Back up first.
-- This refuses to orphan any stored original. Coordinate Flyway history separately.
BEGIN;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM financial_documents) THEN
  RAISE EXCEPTION 'Refusing rollback: delete originals through authorized API and verify retention first';
 END IF;
END $$;
DROP TABLE document_chunks;
DROP TABLE IF EXISTS financial_document_versions;
DROP TABLE document_processing_jobs;
DROP TABLE document_source_connectors;
DROP TABLE document_access_grants;
DROP TABLE rag_query_audit;
DROP TABLE financial_documents;
DROP TABLE IF EXISTS public.ceroa_rag_configuration;
-- vector is shared with existing n8n_aux RAG: do not drop it.
COMMIT;
