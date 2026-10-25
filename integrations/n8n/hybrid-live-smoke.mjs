import {request} from '../../frontend/node_modules/@playwright/test/index.mjs';
import {writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const baseURL='http://localhost:8080';
const api=await request.newContext({baseURL});let csrf,logged=false;
const fixturePath='tmp/hybrid-activation/live-fixture.json';
function pdf(lines){
 const content='BT /F1 11 Tf 45 780 Td '+lines.map((line,i)=>(i?'0 -22 Td ':'')+'('+line.replace(/[\\()]/g,'\\$&')+') Tj').join('\n')+' ET';
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
 let output='%PDF-1.4\n';const offsets=[0];objects.forEach((o,i)=>{offsets.push(Buffer.byteLength(output));output+=`${i+1} 0 obj\n${o}\nendobj\n`;});const xref=Buffer.byteLength(output);output+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n ').join('\n')}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;return Buffer.from(output);
}
async function post(path,data){return api.post(path,{headers:{'X-XSRF-TOKEN':csrf},data,timeout:45000});}
try{
 for(let i=0;i<30;i++){try{if((await api.get('/api/v1/auth/csrf',{timeout:2000})).ok())break;}catch{}await new Promise(r=>setTimeout(r,1000));}
 csrf=(await (await api.get('/api/v1/auth/csrf')).json()).token;
 const login=await post('/api/v1/auth/login',{email:'demo@ceroa.local',password:'Demo123!'});assert.equal(login.status(),200);logged=true;
 csrf=(await (await api.get('/api/v1/auth/csrf')).json()).token;
 const original=pdf(['DOCUMENTO SINTETICO CEROA - SIN VALOR FINANCIERO REAL','Entidad: Banco Sintetico Ceroa','Tipo de identificacion: CC','Periodo: 2026-09-01 hasta 2026-10-01 (fin exclusivo)','Concepto: cobreazul, intereses cobrados y comision de manejo.','Importe de ejemplo: 123,45.','No contiene datos personales ni obligaciones reales.']);
 const metadata={identificationType:'CC',documentType:'BANK_STATEMENT',financialEntity:'Banco Sintetico Ceroa',periodStart:'2026-09-01',periodEnd:'2026-10-01',issuedAt:null,debtId:null};
 const financeBefore=createHash('sha256').update(await (await api.get('/api/v1/debts')).text()+await (await api.get('/api/v1/payments')).text()).digest('hex');
 let fixture;
 if(process.argv.includes('--reuse'))fixture=JSON.parse(await readFile(fixturePath,'utf8'));
 else{
  const upload=await api.post('/api/v1/financial-documents?consent=true',{headers:{'X-XSRF-TOKEN':csrf},multipart:{file:{name:'ceroa-synthetic-verification.pdf',mimeType:'application/pdf',buffer:original},metadata:{name:'metadata.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(metadata))}},timeout:45000});
  assert.equal(upload.status(),200,`Upload failed: HTTP ${upload.status()}`);fixture=await upload.json();await writeFile(fixturePath,JSON.stringify(fixture));console.log(JSON.stringify({upload:'OK',status:fixture.status}));
 }
 let d;
 for(let i=0;i<65;i++){
  const res=await api.get(`/api/v1/financial-documents/${fixture.id}`);assert.equal(res.status(),200);d=await res.json();
  if(i%5===0)console.log(JSON.stringify({processing:d.status}));
  if(['INDEXED','REVIEW_REQUIRED','FAILED'].includes(d.status))break;
  await new Promise(resolve=>setTimeout(resolve,3000));
 }
 if(d.status!=='INDEXED'){const jobs=await (await api.get(`/api/v1/financial-documents/${fixture.id}/jobs`)).json();console.log(JSON.stringify({jobs:jobs.map(j=>({status:j.status,errorCode:j.errorCode,attempts:j.attempts}))}));}
 assert.equal(d.status,'INDEXED','Real ingestion must complete before activation');
 const query={intent:'METADATA_SEARCH',filters:{identificationType:'CC',documentType:'BANK_STATEMENT',financialEntity:metadata.financialEntity,periodFrom:'2026-09-01',periodToExclusive:'2026-11-01'},offset:0,limit:10};
 let result=await post('/api/v1/financial-documents/search',query);assert.equal(result.status(),200);assert.ok((await result.json()).documents.some(d=>d.id===fixture.id));
 result=await post('/api/v1/financial-documents/search',{...query,filters:{...query.filters,identificationType:'CE'}});assert.equal(result.status(),200);assert.equal((await result.json()).documents.length,0);
 result=await post('/api/v1/financial-documents/search',{...query,intent:'HYBRID_SEARCH',question:'cobreazul intereses cobrados comision de manejo'});assert.equal(result.status(),200);const hybrid=await result.json();assert.ok(hybrid.sources.some(s=>s.documentId===fixture.id&&s.page===1));
 const download=await post(`/api/v1/financial-documents/${fixture.id}/download`,{});assert.equal(download.status(),200);const link=await download.json();assert.equal(link.expiresIn,60);const file=await api.get(link.url);assert.equal(file.status(),200);assert.equal(createHash('sha256').update(await file.body()).digest('hex'),createHash('sha256').update(original).digest('hex'));
 const anonymous=await request.newContext({baseURL});try{assert.equal((await anonymous.get(`/api/v1/financial-documents/${fixture.id}`)).status(),401);}finally{await anonymous.dispose();}
 const financeAfter=createHash('sha256').update(await (await api.get('/api/v1/debts')).text()+await (await api.get('/api/v1/payments')).text()).digest('hex');assert.equal(financeAfter,financeBefore);
 console.log(JSON.stringify({ingestion:'INDEXED',exactFilters:'OK',ccVsCe:'OK',hybridSources:hybrid.sources.length,pageReference:'OK',signedDownload:'BYTE_IDENTICAL',anonymousAccess:'DENIED',financialData:'UNCHANGED',traceId:hybrid.traceId}));
}catch(error){
 console.error(JSON.stringify({verification:'FAILED',reason:error.code==='ERR_ASSERTION'?error.message.split('\n')[0]:error.name}));process.exitCode=1;
}finally{
 if(logged)await post('/api/v1/auth/logout',{});await api.dispose();
}
