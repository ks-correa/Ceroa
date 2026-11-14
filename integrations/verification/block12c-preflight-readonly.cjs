const fs=require('node:fs'),cp=require('node:child_process');
const run=(args,options={})=>cp.execFileSync('docker',args,{encoding:'utf8',stdio:['pipe','pipe','pipe'],...options});
const names=['ceroa-backend','ceroa-frontend','ceroa-n8n','ceroa-telegram-proxy','ceroa-telegram-tunnel'];
const inspect=()=>JSON.parse(run(['inspect',...names]));const safe=c=>({name:c.Name.slice(1),id:c.Id,image:c.Image,startedAt:c.State.StartedAt,restarts:c.RestartCount,status:c.State.Status});
const before=inspect(); const env=Object.fromEntries(before[0].Config.Env.map(x=>{const i=x.indexOf('=');return [x.slice(0,i),x.slice(i+1)]}));
const url=new URL(env.DB_URL.replace(/^jdbc:/,''));if(url.port==='6543')throw Error('Session pooler required');
const pg={...process.env,PGHOST:url.hostname,PGPORT:url.port||'5432',PGDATABASE:url.pathname.slice(1),PGUSER:env.DB_USERNAME,PGPASSWORD:env.DB_PASSWORD,PGSSLMODE:'require',PGCONNECT_TIMEOUT:'15',PGOPTIONS:'-c default_transaction_read_only=on'};
try {
 const args=['run','--rm','--pull','never','-i',...['PGHOST','PGPORT','PGDATABASE','PGUSER','PGPASSWORD','PGSSLMODE','PGCONNECT_TIMEOUT','PGOPTIONS'].flatMap(k=>['-e',k]),'pgvector/pgvector:pg17','psql','-X','-qAt','-v','ON_ERROR_STOP=1','-v','bucket='+(env.DOCUMENT_LIBRARY_BUCKET||'financial-documents')];
 const data=JSON.parse(run(args,{env:pg,input:fs.readFileSync('integrations/verification/block12c-preflight-readonly.sql','utf8')}).trim());
 const after=inspect();const result={sourcePlan:{plan:'Free',managedBackups:false,pitr:false,evidence:'Confirmed personally by user in Block 12C'},postgres:data,storageCredentialConfigured:!!env.DOCUMENT_LIBRARY_STORAGE_KEY,runtimeBefore:before.map(safe),runtimeAfter:after.map(safe),runtimeIdentityUnchanged:JSON.stringify(before.map(safe))===JSON.stringify(after.map(safe)),financialExportPerformed:false,storageDownloadPerformed:false,v31Applied:false};
 fs.mkdirSync('docs/benchmarks/block12c',{recursive:true});fs.writeFileSync('docs/benchmarks/block12c/preflight-results.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({readOnly:data.readOnly,backupPrivileges:data.backupPrivileges,schemas:data.applicationSchemas,externalDependencies:data.externalDependencies,storage:data.storage,documentReferences:data.documentReferences,outbox:data.outbox,v31Exists:data.v31Exists,runtimeIdentityUnchanged:result.runtimeIdentityUnchanged}));
}catch(e){console.error(JSON.stringify({status:'FAILED',exitCode:e.status,detailsSuppressed:true}));process.exitCode=1;}

