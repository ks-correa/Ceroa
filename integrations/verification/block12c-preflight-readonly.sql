BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout='20s';
SELECT jsonb_build_object(
'observedAt',now(),'readOnly',current_setting('transaction_read_only'),'version',current_setting('server_version'),
'backupPrivileges',jsonb_build_object('allApplicationTablesSelectable',NOT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p') AND (n.nspname='ceroa' OR n.nspname='public' AND c.relname LIKE 'ceroa_%') AND NOT has_table_privilege(c.oid,'SELECT')),'bypassRls',(SELECT rolbypassrls FROM pg_roles WHERE rolname=current_user)),
'applicationSchemas',(SELECT jsonb_agg(row_to_json(x)) FROM (SELECT n.nspname AS schema,count(*) AS tables FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p') AND (n.nspname='ceroa' OR n.nspname='public' AND c.relname LIKE 'ceroa_%') GROUP BY n.nspname) x),
'externalForeignKeys',(SELECT coalesce(jsonb_agg(row_to_json(x)),'[]'::jsonb) FROM (SELECT a.relname AS source_table,nt.nspname AS target_schema,b.relname AS target_table FROM pg_constraint k JOIN pg_class a ON a.oid=k.conrelid JOIN pg_namespace ns ON ns.oid=a.relnamespace JOIN pg_class b ON b.oid=k.confrelid JOIN pg_namespace nt ON nt.oid=b.relnamespace WHERE k.contype='f' AND ns.nspname='ceroa' AND nt.nspname<>'ceroa') x),
'externalDependencies',(SELECT coalesce(jsonb_agg(row_to_json(x)),'[]'::jsonb) FROM (SELECT DISTINCT ns.nspname AS source_schema,nt.nspname AS target_schema,d.refclassid::regclass::text AS catalog FROM pg_depend d JOIN pg_class c ON d.classid='pg_class'::regclass AND d.objid=c.oid JOIN pg_namespace ns ON c.relnamespace=ns.oid JOIN pg_type t ON d.refclassid='pg_type'::regclass AND d.refobjid=t.oid JOIN pg_namespace nt ON t.typnamespace=nt.oid WHERE ns.nspname='ceroa' AND nt.nspname NOT IN ('ceroa','pg_catalog')) x),
'customTriggers',(SELECT count(*) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ceroa' AND NOT t.tgisinternal),
'foreignTables',(SELECT count(*) FROM pg_foreign_table f JOIN pg_class c ON c.oid=f.ftrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='ceroa'),
'flyway',(SELECT jsonb_agg(jsonb_build_object('version',version,'script',script,'checksum',checksum,'success',success) ORDER BY installed_rank) FROM ceroa.flyway_schema_history),
'v31Exists',to_regclass('ceroa.subscription_charges') IS NOT NULL,
'extensions',(SELECT jsonb_agg(jsonb_build_object('name',extname,'version',extversion,'schema',n.nspname)) FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace),
'outbox',(SELECT coalesce(jsonb_agg(row_to_json(x)),'[]'::jsonb) FROM (SELECT channel,status,count(*) AS count FROM ceroa.integration_events GROUP BY channel,status) x),
'subscriptions',(SELECT count(*) FROM ceroa.plus_subscriptions),
'storage',jsonb_build_object('buckets',(SELECT count(*) FROM storage.buckets),'objects',(SELECT count(*) FROM storage.objects),'publicBuckets',(SELECT count(*) FROM storage.buckets WHERE public)),
'documentReferences',jsonb_build_object('current',(SELECT count(*) FROM ceroa.financial_documents),'archived',(SELECT count(*) FROM ceroa.financial_document_versions),'missingCurrentMetadata',(SELECT count(*) FROM ceroa.financial_documents d WHERE NOT EXISTS(SELECT 1 FROM storage.objects o JOIN storage.buckets b ON b.id=o.bucket_id WHERE b.id=:'bucket' AND o.name=d.storage_path)),'missingArchivedMetadata',(SELECT count(*) FROM ceroa.financial_document_versions d WHERE NOT EXISTS(SELECT 1 FROM storage.objects o JOIN storage.buckets b ON b.id=o.bucket_id WHERE b.id=:'bucket' AND o.name=d.storage_path)))
);
ROLLBACK;
