import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const files=['hybrid-rag-ingestion.json','hybrid-rag-sync.json','hybrid-rag-query.json','hybrid-rag-ocr.json'];
for(const file of files)test(`${file}: private, importable contract and valid connections`,async()=>{
  const w=JSON.parse(await readFile(new URL(file,import.meta.url),'utf8'));
  assert.equal(w.active,false);assert.equal(w.settings.saveDataSuccessExecution,'none');assert.equal(w.settings.saveDataErrorExecution,'none');
  const names=new Set(w.nodes.map(n=>n.name));assert.equal(names.size,w.nodes.length);
  assert.ok(w.nodes.some(n=>n.type==='n8n-nodes-base.supabase'&&n.parameters.tableId==='ceroa_rag_configuration'));
  for(const n of w.nodes){assert.equal(n.credentials,undefined);assert.ok(!n.type.includes('postgres'));if(n.parameters.jsCode)new Function(n.parameters.jsCode);if(n.type==='n8n-nodes-base.webhook')assert.equal(n.parameters.authentication,'headerAuth');}
  for(const [source,outputs] of Object.entries(w.connections)){assert.ok(names.has(source));for(const branches of Object.values(outputs))for(const branch of branches)for(const link of branch)assert.ok(names.has(link.node));}
});
test('agent-controlled filter values cannot change tool host/path or insert an owner',async()=>{
  const w=JSON.parse(await readFile(new URL('hybrid-rag-query.json',import.meta.url),'utf8'));
  const tool=w.nodes.find(n=>n.name==='Consultar documentos financieros');const expr=tool.parameters.url.slice(3,-2);
  const url=new URL(new Function('$fromAI','$',`return (${expr});`)((name)=>name==='intent'?'METADATA_SEARCH':'https://attacker.invalid/?ownerId=foreign&sql=DELETE',()=>({first:()=>({json:{requestId:'fixed-context'}})})));
  assert.equal(url.origin,'http://backend:8080');assert.equal(url.pathname,'/api/v1/assistant-tools/requests/fixed-context/financial-documents');assert.equal(url.searchParams.has('ownerId'),false);assert.equal(url.searchParams.has('sql'),false);
});
test('OCR builds a complete provider request without embedding nested schemas in inline expressions',async()=>{
  const w=JSON.parse(await readFile(new URL('hybrid-rag-ocr.json',import.meta.url),'utf8'));
  const config={id:'financial-library-v1',embedding_model:'gemini-embedding-001',dimensions:768,schema_version:21,max_file_bytes:8388608,max_pages:25};
  const body={pdf:Buffer.from('%PDF-1.4 synthetic fixture').toString('base64'),pageCount:2};
  const validate=w.nodes.find(n=>n.id==='ocr-validate');const [out]=new Function('$json','$',validate.parameters.jsCode)(config,()=>({first:()=>({json:{body}})}));
  assert.equal(out.json.request.contents[0].parts[0].inlineData.data,body.pdf);
  assert.deepEqual(out.json.request.generationConfig.responseSchema.required,['uncertain','segments']);
  const http=w.nodes.find(n=>n.id==='ocr-gemini');const encoded=new Function('$json','return '+http.parameters.jsonBody.slice(3,-2))(out.json);
  assert.equal(JSON.parse(encoded).generationConfig.responseMimeType,'application/json');
});
