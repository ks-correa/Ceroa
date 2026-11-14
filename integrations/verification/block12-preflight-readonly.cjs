const fs=require('node:fs'),cp=require('node:child_process');
const run=(a,o={})=>cp.execFileSync('docker',a,{encoding:'utf8',stdio:['pipe','pipe','pipe'],...o});
const names=['ceroa-backend','ceroa-frontend','ceroa-n8n','ceroa-telegram-proxy','ceroa-telegram-tunnel'];
const inspect=()=>JSON.parse(run(['inspect',...names]));
const before=inspect();
const env=Object.fromEntries(before[0].Config.Env.map(x=>{const i=x.indexOf('=');return [x.slice(0,i),x.slice(i+1)]}));
const u=new URL(env.DB_URL.replace(/^jdbc:/,''));
const pg={...process.env,PGHOST:u.hostname,PGPORT:u.port||'5432',PGDATABASE:u.pathname.slice(1),PGUSER:env.DB_USERNAME,PGPASSWORD:env.DB_PASSWORD,PGSSLMODE:'require',PGCONNECT_TIMEOUT:'15',PGOPTIONS:'-c default_transaction_read_only=on'};
const sql=`BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout='15s';
SELECT jsonb_build_object('observedAt',now(),'readOnly',current_setting('transaction_read_only'),'database',current_database(),'postgresVersion',current_setting('server_version'),
'flywaySuccessful',(SELECT count(*) FROM ceroa.flyway_schema_history WHERE success),'flywayFailed',(SELECT count(*) FROM ceroa.flyway_schema_history WHERE NOT success),'lastMigration',(SELECT version FROM ceroa.flyway_schema_history ORDER BY installed_rank DESC LIMIT 1),
'v31TableExists',to_regclass('ceroa.subscription_charges') IS NOT NULL,'publicRagConfigurationExists',to_regclass('public.ceroa_rag_configuration') IS NOT NULL,
'extensions',(SELECT jsonb_agg(jsonb_build_object('name',extname,'version',extversion,'schema',n.nspname)) FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace),
'outbox',(SELECT coalesce(jsonb_agg(row_to_json(x)),'[]'::jsonb) FROM (SELECT channel,status,count(*) AS count FROM ceroa.integration_events GROUP BY channel,status) x),
'leases',(SELECT jsonb_build_object('leased',count(*) FILTER(WHERE status='LEASED'),'dispatching',count(*) FILTER(WHERE status='DISPATCHING'),'ambiguous',count(*) FILTER(WHERE status='AMBIGUOUS'),'expired',count(*) FILTER(WHERE lease_until<now() AND status IN ('LEASED','DISPATCHING'))) FROM ceroa.integration_events),
'subscriptions',(SELECT count(*) FROM ceroa.plus_subscriptions),'storage',jsonb_build_object('buckets',(SELECT count(*) FROM storage.buckets),'objects',(SELECT count(*) FROM storage.objects),'publicBuckets',(SELECT count(*) FROM storage.buckets WHERE public)));
ROLLBACK;`;
let db;
try {db=JSON.parse(run(['run','--rm','--pull','never','-i',...Object.keys(pg).filter(k=>k.startsWith('PG')).flatMap(k=>['-e',k]),'pgvector/pgvector:pg17','psql','-X','-qAt','-v','ON_ERROR_STOP=1'],{env:pg,input:sql}).trim());}catch(e){db={status:'FAILED',exitCode:e.status,detailsSuppressed:true};}
const after=inspect();const safe=c=>({name:c.Name.slice(1),id:c.Id,image:c.Image,startedAt:c.State.StartedAt,restartCount:c.RestartCount,status:c.State.Status});
const managementNames=new Set(Object.keys(env).filter(k=>/SUPABASE.*(ACCESS|MANAGEMENT).*TOKEN/.test(k)));
for(const file of fs.readdirSync('.').filter(x=>/^\.env(?:\.|$)/.test(x))){if(!fs.statSync(file).isFile())continue;for(const line of fs.readFileSync(file,'utf8').split(/\r?\n/)){const m=line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/);if(m&&/SUPABASE.*(ACCESS|MANAGEMENT).*TOKEN/.test(m[1]))managementNames.add(m[1]);}}
const result={date:'2026-11-09',commit:cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),postgres:db,connectionMode:u.hostname.includes('pooler')?(u.port==='6543'?'transaction-pooler':'session-pooler'):'direct-or-custom',managementTokenCandidatePresent:managementNames.size>0,browserInventory:{apps:0,browsers:0},encryptedHostVolumeVerification:'UNVERIFIED: manage-bde access denied; Get-BitLockerVolume yielded no status',backupExported:false,storageDownloaded:false,v31Applied:false,servicesBefore:before.map(safe),servicesAfter:after.map(safe),runtimeIdentityUnchanged:JSON.stringify(before.map(safe))===JSON.stringify(after.map(safe)),temporaryCredentialFileCreated:false};
fs.writeFileSync('docs/benchmarks/block12/preflight-results.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
