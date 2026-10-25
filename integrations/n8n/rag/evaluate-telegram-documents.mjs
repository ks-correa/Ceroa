import {request} from '../../../frontend/node_modules/@playwright/test/index.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {randomUUID,randomInt,createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import assert from 'node:assert/strict';

// Real backend + Gemini + Storage evaluation. Fake Telegram identity; no external sends.
const api=await request.newContext({baseURL:'http://localhost:8080'});
const env=Object.fromEntries((await readFile('.env','utf8')).split(/\r?\n/).filter(l=>l&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1)];}));
const key=env.ASSISTANT_WORKER_KEY;assert.ok(key?.length>=32);
const path='tmp/rag-v21/telegram-document-identity.json';
const journal={email:`hybrid-test-${randomUUID()}@example.invalid`,senderId:8_000_000_000_000_000+randomInt(100_000_000),receipts:[],documents:[]};
let sequence=journal.senderId,csrf,logged=false;
async function save(){await writeFile(path,JSON.stringify(journal));}
async function token(){return (await(await api.get('/api/v1/auth/csrf')).json()).token;}
async function worker(route,data){const r=await api.post('/api/v1/assistant-tools/telegram/'+route,{headers:{'X-Ceroa-Assistant':key},data,timeout:165000});assert.equal(r.status(),200);return r.json();}
async function event(text,document=null){const updateId=++sequence;journal.receipts.push(updateId);await save();return worker('updates',{updateId,senderId:journal.senderId,chatId:journal.senderId,privateChat:true,text,document});}
async function command(text){const reply=await event(text);return reply.deliveryToken?worker('delivery',{token:reply.deliveryToken}):reply;}
async function ready(id){for(let i=0;i<100;i++){const r=await api.get(`/api/v1/financial-documents/${id}`);assert.equal(r.status(),200);const d=await r.json();if(d.status==='INDEXED')return d;if(['FAILED','REVIEW_REQUIRED'].includes(d.status))throw Error('Indexing status '+d.status);await new Promise(r=>setTimeout(r,2000));}throw Error('Indexing timed out');}
const attachment=async file=>({fileName:file,mime:'application/pdf',data:(await readFile('tmp/rag-v21/'+file)).toString('base64')});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
try {
  for(let i=0;i<30;i++){try{if((await api.get('/api/v1/auth/csrf',{timeout:2000})).ok())break;}catch{}await new Promise(r=>setTimeout(r,1000));}
  csrf=await token();const password='A!'+randomUUID();
  const registered=await api.post('/api/v1/auth/register',{headers:{'X-XSRF-TOKEN':csrf},data:{fullName:'Prueba Telegram Documentos',email:journal.email,phone:'3000000000',birthDate:'1990-01-01',password,confirmPassword:password,acceptTerms:true,acceptPrivacy:true}});assert.equal(registered.status(),200);journal.id=(await registered.json()).id;logged=true;csrf=await token();await save();
  const cp=(await readFile('backend/target/document-test-classpath.txt','utf8')).trim();await promisify(execFile)('java',['-Dfile.encoding=UTF-8','-cp',cp,'integrations/n8n/rag/TelegramDocumentEvaluationIdentity.java']);
  const file=await attachment('auto-extract.pdf');const identity={updateId:sequence,senderId:journal.senderId,chatId:journal.senderId,privateChat:true,document:{...file,data:''}};
  assert.equal((await worker('authorize',identity)).allowed,false);await command('/autorizar_documentos');assert.equal((await worker('authorize',identity)).allowed,true);
  const uploaded=await event('',file);const id=/ID: ([a-f0-9-]{36})/.exec(uploaded.answer)?.[1];assert.ok(id);journal.documents.push(id);await save();await worker('delivery',{token:uploaded.deliveryToken});
  let doc=await ready(id);assert.equal(doc.identificationType,'CC');assert.equal(doc.documentType,'BANK_STATEMENT');assert.equal(doc.periodEnd,'2026-10-01');
  assert.match((await command('/documentos')).answer,new RegExp(id));assert.match((await command('/buscar_documentos identificacion=CC desde=2026-09-01 hasta=2026-10-01')).answer,new RegExp(id));
  const semantic=await command('/buscar_documentos texto="cuota de manejo" identificacion=CC');assert.match(semantic.answer,new RegExp(id));
  const original=await command('/descargar '+id);assert.equal(hash(Buffer.from(original.attachment.data,'base64')),hash(Buffer.from(file.data,'base64')));
  await command('/reemplazar '+id+' 1');const replaced=await event('',await attachment('replacement.pdf'));assert.match(replaced.answer,/Original reemplazado/);doc=await ready(id);assert.equal(doc.version,2);
  const versions=await command('/versiones '+id);assert.match(versions.answer,/Versión 1/);assert.match(versions.answer,/Versión 2/);
  const archived=await command('/descargar '+id+' 1');assert.equal(hash(Buffer.from(archived.attachment.data,'base64')),hash(Buffer.from(file.data,'base64')));
  await command('/metadatos '+id+' entidad="Banco Corregido Telegram"');assert.equal((await(await api.get(`/api/v1/financial-documents/${id}`)).json()).financialEntity,'Banco Corregido Telegram');await ready(id);
  const reprocess=await command('/reprocesar '+id);assert.match(reprocess.answer,/Reanálisis solicitado/);await ready(id);
  const confirmation=await command('/eliminar_documento '+id);const deleteToken=/\/confirmar_eliminacion ([a-f0-9]{32})/.exec(confirmation.answer)?.[1];assert.ok(deleteToken);
  assert.match((await command('/confirmar_eliminacion '+deleteToken)).answer,/eliminados/);assert.equal((await api.get(`/api/v1/financial-documents/${id}`)).status(),404);
  await command('/revocar_documentos');assert.equal((await worker('authorize',identity)).allowed,false);
  const report={sameWebLibrary:true,consentEnforced:true,automaticMetadata:true,metadataSearch:true,semanticSearch:true,currentDownloadExactBytes:true,replacement:true,history:true,archivedDownloadExactBytes:true,metadataCorrection:true,reprocessing:true,confirmedDeletion:true,consentRevocation:true,externalTelegramMessagesSent:0};
  await writeFile('tmp/rag-v21/telegram-document-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
} catch(e){console.error(JSON.stringify({telegramDocuments:'FAILED',reason:e.message?.slice(0,200)}));process.exitCode=1;}
finally {
  if(logged){let deleted=true;for(const id of journal.documents){const r=await api.delete(`/api/v1/financial-documents/${id}`,{headers:{'X-XSRF-TOKEN':csrf},timeout:45000});if(![204,404].includes(r.status()))deleted=false;}journal.documentDeleted=deleted;await save();await api.post('/api/v1/auth/logout',{headers:{'X-XSRF-TOKEN':csrf}});console.log(JSON.stringify({syntheticDocumentsDeleted:deleted}));}
  await api.dispose();
}
