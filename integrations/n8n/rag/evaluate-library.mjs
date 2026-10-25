import {request} from '../../../frontend/node_modules/@playwright/test/index.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import assert from 'node:assert/strict';

// Real provider evaluation against isolated synthetic documents, always deleted through the API.
const api=await request.newContext({baseURL:'http://localhost:8080'});const runId=randomUUID();
const journal={email:`hybrid-test-${runId}@example.invalid`,receipts:[]};const documents=[];const report={runId,cases:[]};let csrf,logged=false;
async function token(){return (await(await api.get('/api/v1/auth/csrf')).json()).token;}
async function post(path,data,timeout=45000){return api.post(path,{headers:{'X-XSRF-TOKEN':csrf},data,timeout});}
async function upload(filename,type,month){const buffer=await readFile(`tmp/rag-v21/${filename}`);const start=`2026-${String(month).padStart(2,'0')}-01`,end=`2026-${String(month+1).padStart(2,'0')}-01`;
 const response=await api.post('/api/v1/financial-documents?consent=true',{headers:{'X-XSRF-TOKEN':csrf},multipart:{file:{name:'extracto.pdf',mimeType:'application/pdf',buffer},metadata:{name:'metadata.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({identificationType:type,documentType:'BANK_STATEMENT',financialEntity:`Evaluacion ${runId}`,periodStart:start,periodEnd:end,issuedAt:null,debtId:null}))}},timeout:45000});assert.equal(response.status(),200);const doc=await response.json();documents.push(doc.id);await writeFile('tmp/rag-v21/evaluation-identity.json',JSON.stringify({...journal,documents}));console.log(JSON.stringify({uploaded:filename,status:doc.status}));return doc;
}
async function indexed(id){let doc;for(let i=0;i<80;i++){const r=await api.get(`/api/v1/financial-documents/${id}`);assert.equal(r.status(),200);doc=await r.json();if(doc.status==='INDEXED')return doc;if(['FAILED','REVIEW_REQUIRED'].includes(doc.status)){const jobs=await(await api.get(`/api/v1/financial-documents/${id}/jobs`)).json();console.log(JSON.stringify({processing:doc.status,codes:jobs.map(j=>j.errorCode)}));break;}await new Promise(r=>setTimeout(r,3000));}throw new Error('Document did not reach INDEXED: '+doc?.status);}
async function evaluate(name,intent,question,filters,expected){const begin=Date.now();const r=await post('/api/v1/financial-documents/search',{intent,question,filters:{financialEntity:`Evaluacion ${runId}`,...filters},offset:0,limit:10});assert.equal(r.status(),200);const result=await r.json();const ids=[...new Set(result.documents.map(d=>d.id))];const tp=ids.filter(id=>expected.includes(id)).length;const score={name,precision:ids.length?tp/ids.length:1,recall:expected.length?tp/expected.length:ids.length?0:1,elapsedMs:Date.now()-begin,documents:ids.length,evidenceStatus:result.evidenceStatus};report.cases.push(score);console.log(JSON.stringify(score));return result;}
try{
 for(let i=0;i<30;i++){try{if((await api.get('/api/v1/auth/csrf',{timeout:2000})).ok())break;}catch{}await new Promise(r=>setTimeout(r,1000));}
 csrf=await token();const password='A!'+randomUUID();const registration=await post('/api/v1/auth/register',{fullName:'Prueba temporal RAG',email:journal.email,phone:'3000000000',birthDate:'1990-01-01',password,confirmPassword:password,acceptTerms:true,acceptPrivacy:true});assert.equal(registration.status(),200);journal.id=(await registration.json()).id;logged=true;csrf=await token();await writeFile('tmp/rag-v21/evaluation-identity.json',JSON.stringify(journal));
 const scanned=await upload('scanned.pdf','CC',9);await indexed(scanned.id);
 const provenance=await(await api.get(`/api/v1/financial-documents/${scanned.id}/proposals`)).json();assert.equal(provenance.extractionMethod,'GEMINI_OCR');
 const ocr=await evaluate('ocr-page-references','HYBRID_SEARCH','AZAFRANRAG cuota de manejo',{identificationType:'CC',periodFrom:'2026-09-01',periodToExclusive:'2026-11-01'},[scanned.id]);assert.ok(ocr.sources.some(s=>s.page===1&&s.content.toUpperCase().includes('AZAFRANRAG')));report.ocr='GEMINI_VERIFIED';
 const ce=await upload('ce-oct.pdf','CE',10);await indexed(ce.id);const aug=await upload('cc-aug.pdf','CC',8);await indexed(aug.id);
 await evaluate('cc-september-october','METADATA_SEARCH',null,{identificationType:'CC',periodFrom:'2026-09-01',periodToExclusive:'2026-11-01'},[scanned.id]);
 await evaluate('ce-october','METADATA_SEARCH',null,{identificationType:'CE',periodFrom:'2026-10-01',periodToExclusive:'2026-11-01'},[ce.id]);
 await evaluate('semantic-handling-fee','SEMANTIC_SEARCH','Documento que explica el cobro por el servicio mensual y la cuota de manejo',{identificationType:'CC',periodFrom:'2026-09-01',periodToExclusive:'2026-11-01'},[scanned.id]);
 await evaluate('hybrid-insurance','HYBRID_SEARCH','VIOLETARAG pago de seguro',{periodFrom:'2026-10-01',periodToExclusive:'2026-11-01'},[ce.id]);
 const next=await readFile('tmp/rag-v21/replacement.pdf');const replaced=await api.post(`/api/v1/financial-documents/${scanned.id}/replace?expectedVersion=1&consent=true`,{headers:{'X-XSRF-TOKEN':csrf},multipart:{file:{name:'extracto.pdf',mimeType:'application/pdf',buffer:next}}});assert.equal(replaced.status(),200);const current=await replaced.json();assert.equal(current.id,scanned.id);assert.equal(current.version,2);await indexed(scanned.id);
 const history=await(await api.get(`/api/v1/financial-documents/${scanned.id}/versions`)).json();assert.equal(history.length,2);assert.deepEqual(history.map(v=>v.version),[2,1]);
 const oldLink=await(await post(`/api/v1/financial-documents/${scanned.id}/versions/1/download`,{})).json();const oldBytes=await(await api.get(oldLink.url)).body();assert.equal(createHash('sha256').update(oldBytes).digest('hex'),createHash('sha256').update(await readFile('tmp/rag-v21/scanned.pdf')).digest('hex'));
 const updated=await evaluate('replacement-current-only','HYBRID_SEARCH','PLATINORAG abono capital',{identificationType:'CC',periodFrom:'2026-09-01',periodToExclusive:'2026-11-01'},[scanned.id]);assert.ok(updated.sources.some(s=>s.content.includes('PLATINORAG')));assert.ok(updated.sources.every(s=>!s.content.includes('AZAFRANRAG')));report.replacement='IDENTITY_PRESERVED_HISTORY_PRIVATE_INDEX_UPDATED';
 report.precisionMean=report.cases.reduce((a,c)=>a+c.precision,0)/report.cases.length;report.recallMean=report.cases.reduce((a,c)=>a+c.recall,0)/report.cases.length;
 const latencies=report.cases.map(c=>c.elapsedMs).sort((a,b)=>a-b);report.latencyMs={p50:latencies[Math.floor((latencies.length-1)*.5)],p95:latencies.at(-1)};
 await writeFile('tmp/rag-v21/evaluation-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({ocr:report.ocr,replacement:report.replacement,precisionMean:report.precisionMean,recallMean:report.recallMean,latencyMs:report.latencyMs}));
}catch(e){console.error(JSON.stringify({evaluation:'FAILED',reason:e.code==='ERR_ASSERTION'?e.message.split('\n')[0]:e.message?.slice(0,120)}));process.exitCode=1;}
finally{
 if(logged){let allDeleted=true;for(const id of documents){let removed=false;for(let i=0;i<3;i++){try{const r=await api.delete(`/api/v1/financial-documents/${id}`,{headers:{'X-XSRF-TOKEN':csrf},timeout:45000});if([204,404].includes(r.status())){removed=true;break;}if(r.status()===429)await new Promise(r=>setTimeout(r,20000));}catch{}}if(!removed)allDeleted=false;}await writeFile('tmp/rag-v21/evaluation-identity.json',JSON.stringify({...journal,documents,documentDeleted:allDeleted}));await post('/api/v1/auth/logout',{});console.log(JSON.stringify({syntheticDocumentsDeleted:allDeleted}));}
 await api.dispose();
}
