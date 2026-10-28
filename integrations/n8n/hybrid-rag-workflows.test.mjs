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
test('monthly document analysis requests coverage and backend arithmetic',async()=>{
  const w=JSON.parse(await readFile(new URL('hybrid-rag-query.json',import.meta.url),'utf8'));
  const agent=w.nodes.find(n=>n.name==='Analizar finanzas');
  const tool=w.nodes.find(n=>n.name==='Consultar documentos financieros');
  assert.match(agent.parameters.options.systemMessage,/PERIOD_ANALYSIS/);
  assert.match(agent.parameters.options.systemMessage,/Calcular con evidencia/);
  assert.match(tool.parameters.url,/nextOffset|offset/);
  assert.ok(agent.parameters.options.maxIterations>=10);
});
test('text and transcribed audio preserve question and selected document scope',async()=>{
  const w=JSON.parse(await readFile(new URL('hybrid-rag-query.json',import.meta.url),'utf8'));
  const code=w.nodes.find(n=>n.name==='Preparar texto').parameters.jsCode;
  const source={requestId:'00000000-0000-4000-8000-000000000001',year:2026,month:10,selectedDocument:{id:'selected-file'},conversation:[]};
  const run=(body,input)=>new Function('$','$input',code)(()=>({first:()=>({json:{body}})}),{first:()=>({json:input})})[0].json;
  const question='Según mis extractos de agosto, qué pagos realicé y a qué tasas';
  assert.deepEqual(run({...source,message:question},{}),run({...source,audio:'synthetic'}, {candidates:[{content:{parts:[{text:question}]}}]}));
  assert.throws(()=>run({...source,audio:'synthetic'},{candidates:[]}));
});
test('unsupported drafts get one correction using existing evidence, without looping the agent',async()=>{
  const w=JSON.parse(await readFile(new URL('hybrid-rag-query.json',import.meta.url),'utf8'));
  assert.equal(w.connections['Validar respuesta'].main[0][0].node,'Revisar borrador con evidencia');
  assert.match(w.nodes.find(n=>n.name==='Revisar borrador con evidencia').parameters.url,/\/review/);
  const branches=w.connections['Borrador respaldado'].main;
  assert.equal(branches[0][0].node,'Validar evidencia en Spring Boot');
  const repair=branches[1][0].node;
  for(const connections of Object.values(w.connections))for(const branch of connections.ai_tool??[])assert.ok(branch.every(link=>link.node!==repair));
  assert.equal(w.connections[repair].main[0][0].node,'Validar respuesta corregida');
  assert.equal(w.connections['Validar respuesta corregida'].main[0][0].node,'Validar evidencia en Spring Boot');
  const validate=w.nodes.find(n=>n.name==='Validar respuesta corregida').parameters.jsCode;
  const response={answer:'Pago {{f1}}.',mode:'personal',sources:[]};
  for(const json of [response,{text:response},{output:response}]){
    const result=new Function('$input','$',validate)({first:()=>({json})},()=>({first:()=>({json:{requestId:'request',message:'pagos de agosto'}})}));
    assert.equal(result[0].json.answer,response.answer);assert.equal(result[0].json.transcript,'pagos de agosto');
  }
  assert.match(w.nodes.find(n=>n.name==='Analizar finanzas').parameters.options.systemMessage,/each requested month separately/);
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
