import {request} from '../../../frontend/node_modules/@playwright/test/index.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';

// Real synthetic end-to-end check: no metadata part is sent with the file.
const api=await request.newContext({baseURL:'http://localhost:8080'});
const journal={email:`hybrid-test-${randomUUID()}@example.invalid`,receipts:[],documents:[]};
let csrf,logged=false;
const path='tmp/rag-v21/automatic-identity.json';
async function token(){return (await(await api.get('/api/v1/auth/csrf')).json()).token;}
try {
  csrf=await token();const password='A!'+randomUUID();
  const registered=await api.post('/api/v1/auth/register',{headers:{'X-XSRF-TOKEN':csrf},data:{fullName:'Prueba carga automatica',email:journal.email,phone:'3000000000',birthDate:'1990-01-01',password,confirmPassword:password,acceptTerms:true,acceptPrivacy:true}});
  assert.equal(registered.status(),200);journal.id=(await registered.json()).id;logged=true;csrf=await token();await writeFile(path,JSON.stringify(journal));
  const response=await api.post('/api/v1/financial-documents?consent=true',{headers:{'X-XSRF-TOKEN':csrf},multipart:{file:{name:'auto-extract.pdf',mimeType:'application/pdf',buffer:await readFile('tmp/rag-v21/auto-extract.pdf')}},timeout:45000});
  assert.equal(response.status(),200);let doc=await response.json();journal.documents.push(doc.id);await writeFile(path,JSON.stringify(journal));
  for(let i=0;i<90&&['PENDING','PROCESSING'].includes(doc.status);i++){await new Promise(r=>setTimeout(r,2000));doc=await(await api.get(`/api/v1/financial-documents/${doc.id}`)).json();}
  assert.equal(doc.status,'INDEXED');assert.equal(doc.identificationType,'CC');assert.equal(doc.documentType,'BANK_STATEMENT');assert.equal(doc.periodStart,'2026-09-01');assert.equal(doc.periodEnd,'2026-10-01');assert.equal(doc.issuedAt,'2026-10-01');assert.match(doc.financialEntity,/Sintetico Automatico/i);
  const search=await api.post('/api/v1/financial-documents/search',{headers:{'X-XSRF-TOKEN':csrf},data:{intent:'METADATA_SEARCH',filters:{identificationType:'CC',documentType:'BANK_STATEMENT',periodFrom:'2026-09-01',periodToExclusive:'2026-10-01'},offset:0,limit:10}});
  assert.equal(search.status(),200);assert.deepEqual((await search.json()).documents.map(d=>d.id),[doc.id]);
  const report={fileOnlyUpload:true,automaticIdentification:true,automaticDocumentType:true,automaticEntity:true,automaticDates:true,inclusivePeriodNormalized:true,metadataRetrieval:true,status:doc.status};
  await writeFile('tmp/rag-v21/automatic-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
} catch(e){console.error(JSON.stringify({automaticUpload:'FAILED',reason:e.message?.slice(0,240)}));process.exitCode=1;}
finally {
  if(logged){let deleted=true;for(const id of journal.documents){const r=await api.delete(`/api/v1/financial-documents/${id}`,{headers:{'X-XSRF-TOKEN':csrf},timeout:45000});if(![204,404].includes(r.status()))deleted=false;}await writeFile(path,JSON.stringify({...journal,documentDeleted:deleted}));await api.post('/api/v1/auth/logout',{headers:{'X-XSRF-TOKEN':csrf}});console.log(JSON.stringify({syntheticDocumentsDeleted:deleted}));}
  await api.dispose();
}
