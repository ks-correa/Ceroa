import {request} from '../../frontend/node_modules/@playwright/test/index.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const env=Object.fromEntries((await readFile('.env','utf8')).split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l)).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1)]));
const baseURL='http://localhost:8080';const demo=await request.newContext({baseURL});const isolated=await request.newContext({baseURL});
let demoCsrf,testCsrf,demoLogged=false,testLogged=false;
const fixture=JSON.parse(await readFile('tmp/hybrid-activation/live-fixture.json','utf8'));
const journal={email:`hybrid-test-${randomUUID()}@example.invalid`,receipts:[]};
async function csrf(api){return (await (await api.get('/api/v1/auth/csrf')).json()).token;}
async function post(api,token,path,data,timeout=45000){return api.post(path,{headers:{'X-XSRF-TOKEN':token},data,timeout});}
async function worker(path,data){return demo.post('/api/v1/assistant-tools/telegram/'+path,{headers:{'X-Ceroa-Assistant':env.ASSISTANT_WORKER_KEY},data,timeout:155000});}
async function update(text,sender){const id=Date.now()*1000+Math.floor(Math.random()*1000);journal.receipts.push(id);await writeFile('tmp/hybrid-activation/test-identity.json',JSON.stringify(journal));return worker('updates',{updateId:id,senderId:sender,chatId:sender,privateChat:true,text,audio:'',mime:''});}
try {
 for(let i=0;i<30;i++){try{if((await demo.get('/api/v1/auth/csrf',{timeout:2000})).ok())break;}catch{}await new Promise(r=>setTimeout(r,1000));}
 demoCsrf=await csrf(demo);assert.equal((await post(demo,demoCsrf,'/api/v1/auth/login',{email:'demo@ceroa.local',password:'Demo123!'})).status(),200);demoLogged=true;demoCsrf=await csrf(demo);
 const before=createHash('sha256').update(await (await demo.get('/api/v1/debts')).text()+await (await demo.get('/api/v1/payments')).text()).digest('hex');
 const answer=await post(demo,demoCsrf,'/api/v1/assistant/messages',{message:'Busca mis extractos bancarios con tipo de identificación CC de septiembre y octubre de 2026. Devuelve los documentos encontrados con sus referencias.'},155000);
 assert.equal(answer.status(),200,`Hybrid conversational request failed: HTTP ${answer.status()}`);const response=await answer.json();assert.ok(response.documents?.some(d=>d.id===fixture.id),'Assistant must retrieve the real authorized fixture');assert.ok(response.traceId);console.log(JSON.stringify({webAssistant:'GROUNDED',references:response.documents.length}));
 const summary=await (await demo.get('/api/v1/dashboard/summary')).json();
 const combined=await post(demo,demoCsrf,'/api/v1/financial-documents/search',{intent:'COMBINED_QUERY',question:'cobreazul intereses cobrados',filters:{identificationType:'CC',periodFrom:'2026-09-01',periodToExclusive:'2026-11-01'},offset:0,limit:10});assert.equal(combined.status(),200);const combinedResult=await combined.json();assert.equal(combinedResult.verifiedData.summary.totalRegisteredDebt,summary.totalRegisteredDebt);assert.ok(combinedResult.sources.some(s=>s.documentId===fixture.id));
 const link=await (await post(demo,demoCsrf,`/api/v1/financial-documents/${fixture.id}/download`,{})).json();const original=await (await demo.get(link.url)).body();
 testCsrf=await csrf(isolated);const password='A!'+randomUUID();const registration=await post(isolated,testCsrf,'/api/v1/auth/register',{fullName:'Prueba temporal RAG',email:journal.email,phone:'3000000000',birthDate:'1990-01-01',password,confirmPassword:password,acceptTerms:true,acceptPrivacy:true});assert.equal(registration.status(),200);testLogged=true;journal.id=(await registration.json()).id;await writeFile('tmp/hybrid-activation/test-identity.json',JSON.stringify(journal));testCsrf=await csrf(isolated);
 assert.equal((await isolated.get(`/api/v1/financial-documents/${fixture.id}`)).status(),404);
 assert.equal((await post(isolated,testCsrf,`/api/v1/financial-documents/${fixture.id}/download`,{})).status(),404);
 const metadata={identificationType:'CC',documentType:'BANK_STATEMENT',financialEntity:'Banco Sintetico Ceroa',periodStart:'2026-09-01',periodEnd:'2026-10-01',issuedAt:null,debtId:null};
 const upload=await isolated.post('/api/v1/financial-documents?consent=true',{headers:{'X-XSRF-TOKEN':testCsrf},multipart:{file:{name:'isolated-synthetic.pdf',mimeType:'application/pdf',buffer:original},metadata:{name:'metadata.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(metadata))}},timeout:45000});assert.equal(upload.status(),200);journal.documentId=(await upload.json()).id;await writeFile('tmp/hybrid-activation/test-identity.json',JSON.stringify(journal));
 let status;for(let i=0;i<60;i++){status=(await (await isolated.get(`/api/v1/financial-documents/${journal.documentId}`)).json()).status;if(['INDEXED','FAILED','REVIEW_REQUIRED'].includes(status))break;await new Promise(r=>setTimeout(r,2500));}assert.equal(status,'INDEXED');
 const ownSearch=await post(isolated,testCsrf,'/api/v1/financial-documents/search',{intent:'METADATA_SEARCH',filters:{identificationType:'CC'},offset:0,limit:10});assert.deepEqual((await ownSearch.json()).documents.map(d=>d.id),[journal.documentId]);console.log(JSON.stringify({crossOwnerRead:'DENIED',crossOwnerDownload:'DENIED',separateIndex:'OK',combinedBackendTotal:'EXACT'}));
 const invitation=await post(isolated,testCsrf,'/api/v1/integrations/telegram',{consent:true});assert.equal(invitation.status(),200);const code=new URL((await invitation.json()).url).searchParams.get('start');
 const sender=8000000000000+Math.floor(Math.random()*1000000);const redeemed=await update('/start '+code,sender);assert.equal(redeemed.status(),200);
 const authorized=await worker('authorize',{updateId:Date.now(),senderId:sender,chatId:sender,privateChat:true,text:'consulta'});assert.equal((await authorized.json()).allowed,true);
 const telegram=await update('Busca mis extractos CC de septiembre y octubre de 2026 con referencias.',sender);assert.equal(telegram.status(),200);const telegramReply=await telegram.json();assert.ok(telegramReply.deliveryToken);assert.ok(telegramReply.answer.includes(journal.documentId));assert.ok(!telegramReply.answer.includes(fixture.id));
 assert.equal((await isolated.delete('/api/v1/integrations/telegram',{headers:{'X-XSRF-TOKEN':testCsrf}})).status(),200);
 const revoked=await worker('delivery',{token:telegramReply.deliveryToken});assert.equal((await revoked.json()).send,false);console.log(JSON.stringify({telegramBackend:'GROUNDED',telegramOwnerScope:'ISOLATED',revokedDelivery:'DENIED',actualTelegramMessagesSent:0}));
 assert.equal((await isolated.delete(`/api/v1/financial-documents/${journal.documentId}`,{headers:{'X-XSRF-TOKEN':testCsrf}})).status(),204);journal.documentDeleted=true;await writeFile('tmp/hybrid-activation/test-identity.json',JSON.stringify(journal));
 const freshLink=await (await post(demo,demoCsrf,`/api/v1/financial-documents/${fixture.id}/download`,{})).json();assert.equal((await demo.get(freshLink.url)).status(),200);
 const remove=await demo.delete(`/api/v1/financial-documents/${fixture.id}`,{headers:{'X-XSRF-TOKEN':demoCsrf}});assert.equal(remove.status(),204);assert.equal((await demo.get(`/api/v1/financial-documents/${fixture.id}`)).status(),404);
 assert.equal((await demo.get(freshLink.url)).status(),404);
 const after=createHash('sha256').update(await (await demo.get('/api/v1/debts')).text()+await (await demo.get('/api/v1/payments')).text()).digest('hex');assert.equal(after,before);console.log(JSON.stringify({syntheticDocuments:'DELETED',originalLinkAfterDeletion:'INVALID',financialData:'UNCHANGED'}));
}catch(error){
 console.error(JSON.stringify({verification:'FAILED',reason:error.code==='ERR_ASSERTION'?error.message.split('\n')[0]:error.name}));process.exitCode=1;
}finally{
 if(demoLogged)await post(demo,demoCsrf,'/api/v1/auth/logout',{});if(testLogged)await post(isolated,testCsrf,'/api/v1/auth/logout',{});await demo.dispose();await isolated.dispose();
}
