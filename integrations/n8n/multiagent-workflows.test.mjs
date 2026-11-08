import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildMultiagent,ids} from './multiagent-workflows.mjs';
const baseline=JSON.parse(fs.readFileSync(new URL('./hybrid-rag-query.json',import.meta.url),'utf8'));
test('native specialists expose only their assigned tools and cannot delegate recursively',()=>{
 const [root,...specialists]=buildMultiagent(baseline);
 assert.equal(root.nodes.filter(n=>n.type.endsWith('.agent')).length,1);
 assert.equal(root.nodes.filter(n=>n.type.endsWith('.toolWorkflow')).length,3);
 assert.equal(root.nodes.filter(n=>n.type.endsWith('.httpRequestTool')).length,0);
 for(const w of specialists){
  assert.equal(w.nodes.filter(n=>n.type.endsWith('.agent')).length,1);
  assert(!w.nodes.some(n=>n.type.endsWith('.toolWorkflow')||n.type.endsWith('.webhook')||n.type.endsWith('.code')));
  assert(w.nodes.some(n=>n.type.endsWith('.outputParserStructured')));
  const tools=w.nodes.filter(n=>n.type.endsWith('.httpRequestTool'));
  if(w.id===ids.SUPPORT)assert.deepEqual(tools.map(n=>n.id),['rag-tool','workspace-mail-proposal']);
  if(w.id===ids.RAG)assert(!tools.some(t=>['data-tool','calc-tool','simulation-tool'].includes(t.id)));
  for(const t of tools){assert(t.parameters.queryParameters.parameters.some(p=>p.name==='scope'&&!p.value.includes('$fromAI')));assert(!JSON.stringify(t).includes('Preparar texto'));}
 }
});
test('wire graph, source credentials and final evidence validators survive the refactor',()=>{
 const source=structuredClone(baseline);source.nodes.find(n=>n.name==='Gemini Ceroa').credentials={googlePalmApi:{id:'preserve-synthetic-id',name:'Synthetic'}};
 const all=buildMultiagent(source);for(const w of all){
  const names=new Set(w.nodes.map(n=>n.name));assert.equal(names.size,w.nodes.length);
  for(const [from,types] of Object.entries(w.connections)){assert(names.has(from));for(const branches of Object.values(types))for(const outputs of branches)for(const e of outputs)assert(names.has(e.node),e.node);}
  assert.equal(w.nodes.find(n=>n.type.endsWith('.lmChatGoogleGemini')).credentials.googlePalmApi.id,'preserve-synthetic-id');
 }
 for(const name of ['Validar respuesta','Revisar borrador con evidencia','Validar evidencia en Spring Boot','Corregir referencias sin nuevas consultas'])assert.deepEqual(all[0].nodes.find(n=>n.name===name),source.nodes.find(n=>n.name===name));
});
test('financial document filters cannot change the host, request scope or FACT intent',()=>{
 const w=buildMultiagent(baseline).find(w=>w.id===ids.FINANCIAL);const tool=w.nodes.find(n=>n.name==='Consultar documentos financieros');
 const evaluate=new Function('$','$fromAI','return '+tool.parameters.url.slice(3,-2));
 const url=new URL(evaluate(()=>({first:()=>({json:{requestId:'fixed-context'}})}),name=>name==='offset'?0:'https://attacker.invalid/?ownerId=foreign'));
 assert.equal(url.origin,'http://backend:8080');assert.equal(url.pathname,'/api/v1/assistant-tools/requests/fixed-context/financial-documents');assert.equal(url.searchParams.get('intent'),'FACT_ANALYSIS');assert(!url.searchParams.has('ownerId'));
});
test('new inline expressions do not prematurely close n8n interpolation',()=>{
 const walk=value=>{if(typeof value==='string'&&value.startsWith('={{'))assert.equal(value.indexOf('}}'),value.length-2,value);else if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object')Object.values(value).forEach(walk);};
 for(const w of buildMultiagent(baseline).slice(1))walk(w.nodes);
});
