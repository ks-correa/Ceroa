import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';import {googleVerification} from './google-live-verification.mjs';
const [operation,configFile,stateDirectory]=process.argv.slice(2);if(!stateDirectory)throw Error('Private state directory required');
const config=JSON.parse(fs.readFileSync(configFile,'utf8'));const workflow=googleVerification(operation,config);fs.mkdirSync(stateDirectory,{recursive:true});
const stateFile=path.join(stateDirectory,operation+'.state.json'),logFile=path.join(stateDirectory,operation+'.log');
const state={operation,status:'STARTED',startedAt:new Date().toISOString()};
fs.writeFileSync(stateFile,JSON.stringify(state),{flag:'wx',mode:0o600});
const workflowFile=path.join(stateDirectory,operation+'.workflow.json');fs.writeFileSync(workflowFile,JSON.stringify(workflow),{mode:0o600});
const run=args=>{const r=spawnSync('docker',args,{encoding:'utf8',maxBuffer:8*1024*1024});fs.appendFileSync(logFile,r.stdout+r.stderr,{mode:0o600});return r;};
try{
 for(const args of [['cp',workflowFile,'ceroa-n8n:/tmp/ceroa-google-verification.json'],['exec','ceroa-n8n','n8n','import:workflow','--input=/tmp/ceroa-google-verification.json']])if(run(args).status)throw Error('PREPARATION_FAILED');
 const r=run(['exec','-e','N8N_RUNNERS_BROKER_PORT=5689','ceroa-n8n','n8n','execute','--id=ceroaGoogleVerification41']);
 const start=r.stdout.indexOf('{\n  "data":');if(start<0)throw Error('RESULT_UNAVAILABLE');const result=JSON.parse(r.stdout.slice(start));
 if(!result.finished||result.data.resultData.error)throw Error('WORKFLOW_FAILED');
 const data=result.data.resultData.runData;const output=name=>data[name]?.at(-1)?.data?.main?.[0]?.map(x=>x.json)??[];
 if(operation==='drive-folder'){const folder=output('Drive crear carpeta de prueba')[0];if(!folder?.id)throw Error('PROVIDER_ID_MISSING');state.folderId=folder.id;state.folderName=folder.name;}
 else if(operation==='sheets-tab'){const rows=output('Sheets leer prueba').filter(r=>r.executionId==='ceroa-workspace-live-test-41');if(rows.length!==1)throw Error('UPSERT_VERIFICATION_FAILED');state.spreadsheetId=config.spreadsheetId;state.sheetName='Pruebas Bloque 4';state.matchingRows=rows.length;state.upsertTwice=true;}
 else{const message=output('Gmail enviar prueba autorizada')[0];if(!message?.id)throw Error('PROVIDER_ID_MISSING');state.providerMessageId=message.id;state.providerThreadId=message.threadId;state.providerAccepted=true;}
 state.status='VERIFIED';
}catch(error){state.status=operation==='gmail-send'?'AMBIGUOUS_DO_NOT_RESEND':'FAILED_REVIEW_BEFORE_RETRY';state.error=['PREPARATION_FAILED','RESULT_UNAVAILABLE','WORKFLOW_FAILED','PROVIDER_ID_MISSING','UPSERT_VERIFICATION_FAILED'].includes(error.message)?error.message:'UNKNOWN';process.exitCode=1;}
state.finishedAt=new Date().toISOString();fs.writeFileSync(stateFile,JSON.stringify(state,null,2),{mode:0o600});console.log(JSON.stringify(state));
