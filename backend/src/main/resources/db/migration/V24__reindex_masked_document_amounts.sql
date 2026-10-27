-- Earlier indexing also masked financial amounts with five or more digits.
-- Rebuild only indexed files containing that marker from their retained originals.
CREATE TEMP TABLE document_amount_reindex ON COMMIT DROP AS
SELECT DISTINCT d.id
FROM financial_documents d
JOIN document_chunks c ON c.document_id = d.id AND c.document_version = d.document_version
WHERE d.processing_status = 'INDEXED'
  AND c.content LIKE '%[NUMERO_PRIVADO]%';

UPDATE financial_documents d
SET document_version = d.document_version + 1,
    processing_status = 'PENDING'
WHERE d.id IN (SELECT id FROM document_amount_reindex);

DELETE FROM document_chunks c
WHERE c.document_id IN (SELECT id FROM document_amount_reindex);

INSERT INTO document_processing_jobs (id, document_id, document_version, status)
SELECT gen_random_uuid(), d.id, d.document_version, 'PENDING'
FROM financial_documents d
JOIN document_amount_reindex r ON r.id = d.id;
