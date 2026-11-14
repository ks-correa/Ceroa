BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout='30s';
SELECT format($f$SELECT jsonb_build_object('table',%L,'count',count(*),'hash',encode(extensions.digest(coalesce(string_agg(encode(extensions.digest(to_jsonb(t)::text,'sha256'),'hex'),'' ORDER BY encode(extensions.digest(to_jsonb(t)::text,'sha256'),'hex')),''),'sha256'),'hex')) FROM %I.%I t;$f$,n.nspname||'.'||c.relname,n.nspname,c.relname)
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p') AND (n.nspname='ceroa' OR n.nspname='public' AND c.relname='ceroa_rag_configuration') ORDER BY n.nspname,c.relname
\gexec
ROLLBACK;
