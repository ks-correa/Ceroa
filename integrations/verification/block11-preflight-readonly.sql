-- Metadata and aggregate operational state only. Does not claim/deliver events.
-- Intended for the currently verified application schema: ceroa.
-- Run with psql -X -v ON_ERROR_STOP=1 and a private connection service/password file.
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '15s';
SELECT current_setting('server_version') AS postgres_version,
       current_database() AS database_name,
       current_setting('transaction_read_only') AS read_only;
SELECT version, script, checksum, success
FROM ceroa.flyway_schema_history ORDER BY installed_rank;
SELECT to_regclass('ceroa.subscription_charges') IS NOT NULL AS v31_table_exists;
SELECT extname, extversion, nspname AS extension_schema
FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace ORDER BY extname;
SELECT channel, status, count(*) AS event_count
FROM ceroa.integration_events GROUP BY channel,status ORDER BY channel,status;
SELECT count(*) FILTER (WHERE status='LEASED') AS leased,
       count(*) FILTER (WHERE status='DISPATCHING') AS dispatching,
       count(*) FILTER (WHERE status='AMBIGUOUS') AS ambiguous,
       count(*) FILTER (WHERE status IN ('LEASED','DISPATCHING') AND lease_until<now()) AS expired_leases
FROM ceroa.integration_events;
SELECT status, count(*) AS subscription_count
FROM ceroa.plus_subscriptions GROUP BY status ORDER BY status;
SELECT n.nspname, c.relname, c.relrowsecurity, c.relforcerowsecurity
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE c.relkind='r' AND (n.nspname='ceroa' OR n.nspname='public' AND c.relname LIKE 'ceroa_%')
ORDER BY n.nspname,c.relname;
SELECT schemaname,tablename,policyname,cmd,roles
FROM pg_policies WHERE schemaname='ceroa' ORDER BY tablename,policyname;
SELECT table_name,grantee,privilege_type
FROM information_schema.role_table_grants
WHERE table_schema='ceroa' AND grantee IN ('anon','authenticated','service_role','PUBLIC')
ORDER BY table_name,grantee,privilege_type;
-- Future objects (including V31) inherit default ACLs; review before migration.
SELECT n.nspname, d.defaclobjtype,
       coalesce(r.rolname,'PUBLIC') AS grantee, a.privilege_type
FROM pg_default_acl d
LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace
CROSS JOIN LATERAL aclexplode(d.defaclacl) a
LEFT JOIN pg_roles r ON r.oid=a.grantee
WHERE n.nspname='ceroa' OR d.defaclnamespace=0;
ROLLBACK;
