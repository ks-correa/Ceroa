const fs=require('node:fs'),cp=require('node:child_process');
const run=(args,options={})=>cp.execFileSync('docker',args,{encoding:'utf8',stdio:['pipe','pipe','pipe'],...options});
const names=['ceroa-backend','ceroa-frontend','ceroa-n8n','ceroa-telegram-proxy','ceroa-telegram-tunnel'];
const before=JSON.parse(run(['inspect',...names]));
const safe=c=>({name:c.Name.slice(1),id:c.Id,image:c.Image,status:c.State.Status,startedAt:c.State.StartedAt,finishedAt:c.State.FinishedAt,restarts:c.RestartCount});
const env=Object.fromEntries(before[0].Config.Env.map(x=>{const i=x.indexOf('=');return [x.slice(0,i),x.slice(i+1)]}));
const result={capturedAt:new Date().toISOString(),runtimeBefore:before.map(safe),configuration:{databaseConfigured:!!env.DB_URL,storageConfigured:!!env.DOCUMENT_LIBRARY_STORAGE_KEY,calendarEnabled:env.CEROA_WORKSPACE_CALENDAR_ENABLED??env.WORKSPACE_CALENDAR_ENABLED??'not-set',geminiKeyPresent:!!(env.GEMINI_API_KEY||env.GOOGLE_API_KEY)},postgres:null};
try{
 const url=new URL(env.DB_URL.replace(/^jdbc:/,''));
 const pg={...process.env,PGHOST:url.hostname,PGPORT:url.port||'5432',PGDATABASE:url.pathname.slice(1),PGUSER:env.DB_USERNAME,PGPASSWORD:env.DB_PASSWORD,PGSSLMODE:'require',PGCONNECT_TIMEOUT:'15',PGOPTIONS:'-c default_transaction_read_only=on'};
 const args=['run','--rm','--pull','never','-i',...['PGHOST','PGPORT','PGDATABASE','PGUSER','PGPASSWORD','PGSSLMODE','PGCONNECT_TIMEOUT','PGOPTIONS'].flatMap(k=>['-e',k]),'pgvector/pgvector:pg17','psql','-X','-qAt','-v','ON_ERROR_STOP=1','-v','bucket='+(env.DOCUMENT_LIBRARY_BUCKET||'financial-documents')];
 result.postgres=JSON.parse(run(args,{env:pg,input:fs.readFileSync('integrations/verification/block12c-preflight-readonly.sql','utf8'),timeout:45000}).trim());
}catch{result.postgres={status:'FAILED',detailsSuppressed:true};}
try{result.n8n=JSON.parse(run(['run','--rm','--network','none','--volumes-from','ceroa-n8n:ro','--entrypoint','node','-i',before.find(x=>x.Name==='/ceroa-n8n').Image,'-'],{input:fs.readFileSync('integrations/n8n/audit-runtime-readonly.cjs','utf8'),timeout:45000}));}catch{result.n8n={status:'FAILED',detailsSuppressed:true};}
result.runtimeAfter=JSON.parse(run(['inspect',...names])).map(safe);result.runtimeUnchanged=JSON.stringify(result.runtimeBefore)===JSON.stringify(result.runtimeAfter);result.productiveMutation=false;
fs.writeFileSync(process.argv[2]??'docs/benchmarks/ceroa-recovery-2026-11-14/runtime-readonly.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({runtime:result.runtimeBefore,postgres:result.postgres?.version,flyway:result.postgres?.flyway?.at(-1)?.version,v31:result.postgres?.v31Exists,outbox:result.postgres?.outbox,n8n:{total:result.n8n?.total,active:result.n8n?.active,credentials:result.n8n?.credentials},runtimeUnchanged:result.runtimeUnchanged}));
