import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {buildMultiagent} from './multiagent-workflows.mjs';import {patchBlock6} from './prepare-block6-runtime.mjs';
const baseline=JSON.parse(fs.readFileSync(new URL('./hybrid-rag-query.json',import.meta.url)));
test('failure telemetry distinguishes quota, parser, contract and tool failures without exporting errors',()=>{
 const expression=buildMultiagent(baseline)[1].nodes.find(n=>n.id==='fail').parameters.jsonBody;
 const classify=new Function('$json','return JSON.parse('+expression.slice(3,-2)+')');
 for(const [error,expected]of [['GoogleGenerativeAI 429 quota exceeded','PROVIDER_QUOTA'],["Model output does not match schema",'PARSER_ERROR'],['403 Forbidden','CONTRACT_ERROR'],['httpRequestTool failed','TOOL_ERROR']])assert.deepEqual(classify({error}),{errorCode:expected});
});
test('error routes use regular outputs and immutable request anchors, rejecting multiple items before grants',()=>{
 for(const w of buildMultiagent(baseline).slice(1)){
  assert.equal(w.nodes.find(n=>n.id==='agent').onError,'continueRegularOutput');assert.equal(w.nodes.find(n=>n.id==='finish').onError,'continueRegularOutput');
  assert.equal(w.connections['Recibir delegación'].main[0][0].node,'Una solicitud por delegacion');
  assert.equal(w.connections['Una solicitud por delegacion'].main[1][0].node,'Rechazar items ambiguos');
  assert(w.nodes.find(n=>n.id==='single').parameters.conditions.conditions[0].leftValue.includes('$input.all().length === 1'));
  assert(w.nodes.find(n=>n.id==='fail').parameters.url.includes('$("Autorizar alcance").first()'));
  assert(!w.nodes.find(n=>n.id==='fail').parameters.url.includes('$json.requestId'));
  const schema=JSON.parse(w.nodes.find(n=>n.id==='parser').parameters.inputSchema);assert.equal(schema.properties.advisoryProposal,undefined);assert.equal(schema.additionalProperties,false);
 }
});
test('deployment patch preserves live tools, model credentials and unconfigured MCP state',()=>{
 const all=buildMultiagent(baseline);for(const w of all){w.nodes=w.nodes.filter(n=>!['single','reject','output','accepted','returned','mcp-public'].includes(n.id));delete w.connections['Consultar capacidad externa MCP'];w.nodes.forEach(n=>n.credentials={synthetic:{id:'keep-current'}});}
 const before=structuredClone(all),patched=patchBlock6(all);assert.deepEqual(all,before);assert.equal(patched.length,4);
 for(const w of patched){assert(!w.nodes.some(n=>n.id==='mcp-public'));const old=before.find(v=>v.id===w.id);for(const n of old.nodes){const next=w.nodes.find(v=>v.id===n.id);assert.deepEqual(next.credentials,n.credentials);if(n.type.endsWith('.httpRequestTool')||n.type.endsWith('.toolWorkflow')||n.type.endsWith('.lmChatGoogleGemini'))assert.deepEqual(next,n);}}
 assert.throws(()=>patchBlock6(patched));
});
