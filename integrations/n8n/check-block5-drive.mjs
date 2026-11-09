// Read-only checks plus reconciliation of the single existing synthetic job. No file creation or delivery.
import fs from 'node:fs';import assert from 'node:assert/strict';
const [logFile,stateFile,draftFile]=process.argv.slice(2);if(!draftFile)throw Error('Execution log, private test state and bound draft required');
let raw=fs.readFileSync(logFile);raw=raw[0]===255&&raw[1]===254?raw.toString('utf16le').replace(/^\uFEFF/,''):raw.toString('utf8');
const start=raw.search(/\{\r?\n  "data":/);assert(start>=0);const run=JSON.parse(raw.slice(start));assert(run.finished&&!run.data.resultData.error);
const state=JSON.parse(fs.readFileSync(stateFile));const draft=JSON.parse(fs.readFileSync(draftFile));
const metadata=run.data.resultData.runData[draft.nodes.find(n=>n.id==='metadata').name][0].data.main[0][0].json;
assert.equal(metadata.id,state.fileId);assert.equal(metadata.md5Checksum,state.checksum);
const sourceId=draft.nodes.find(n=>n.id==='validate').parameters.jsonBody.match(/[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}/)?.[0];assert(sourceId);
const env=Object.fromEntries(fs.readFileSync('.env','utf8').split(/\r?\n/).filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).replace(/^['"]|['"]$/g,'')]));
const post=async(suffix,body,authenticated=true)=>{const r=await fetch('http://localhost:8080/api/v1/workspace-tools/drive/'+suffix,{method:'POST',headers:{'Content-Type':'application/json',...(authenticated?{'X-Ceroa-Workspace':env.WORKSPACE_WORKER_KEY}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});const text=await r.text();return{status:r.status,body:text?JSON.parse(text):null};};
const m={...metadata,size:Number(metadata.size)};
const unchanged=await post('validate',{sourceId,metadata:m});assert.equal(unchanged.status,200);assert.equal(unchanged.body.status,'UNCHANGED');
const wrongFolder=await post('validate',{sourceId,metadata:{...m,parents:['unapproved-test-folder']}});assert.equal(wrongFolder.status,403);
const inconsistent=await post('validate',{sourceId,metadata:{...m,md5Checksum:'0'.repeat(32)}});assert.equal(inconsistent.status,409);
const anonymous=await post('validate',{sourceId,metadata:m},false);assert([401,403].includes(anonymous.status));
const result=await post('reconcile',{});assert.equal(result.status,200);
const reconciled=result.body.find(x=>x.fileId===state.fileId);assert(reconciled);assert.equal(reconciled.status,'READY');
console.log(JSON.stringify({unchanged:'PASS',wrongFolderRejected:true,inconsistentChecksumRejected:true,anonymousRejected:true,reconciledStatus:reconciled.status,documentVersion:reconciled.documentVersion,automaticTriggerTested:false,authenticatedRagConversationTested:false}));
