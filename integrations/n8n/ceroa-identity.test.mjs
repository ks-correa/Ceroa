import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {buildMultiagent} from './multiagent-workflows.mjs';
import {identifyCeroa} from './ceroa-identity.mjs';
const files=['multiagent-query.json','financial-agent.json','knowledge-agent.json','support-agent.json'];
const baseline=JSON.parse(fs.readFileSync(new URL('./hybrid-rag-query.json',import.meta.url),'utf8'));
const built=buildMultiagent(baseline);
test('identity change preserves workflow/node IDs, credentials, webhooks, settings and contracts',()=>{
 for(const [i,file] of files.entries()){
  const before=JSON.parse(execFileSync('git',['show','8c6ac23:integrations/n8n/'+file],{encoding:'utf8'}));
  const identified=identifyCeroa([before])[0];
  const after=built[i];assert.equal(after.name,identified.name);assert.equal(after.id,before.id);assert.equal(after.active,before.active);assert.deepEqual(after.settings,before.settings);
  for(const n of before.nodes){const a=after.nodes.find(x=>x.id===n.id),idNode=identified.nodes.find(x=>x.id===n.id);assert(a,n.id);assert.equal(a.name,idNode.name);for(const k of ['type','typeVersion','credentials','webhookId','onError'])assert.deepEqual(a[k],n[k]);if(n.type.endsWith('.outputParserStructured'))assert.deepEqual(a.parameters,n.parameters);}
  assert.deepEqual(JSON.parse(fs.readFileSync(new URL('./'+file,import.meta.url),'utf8')),after);
 }
});
test('all named expression references and connection endpoints resolve after renaming',()=>{
 for(const w of built){const names=new Set(w.nodes.map(n=>n.name));
  for(const [from,types] of Object.entries(w.connections)){assert(names.has(from));for(const branches of Object.values(types))for(const edges of branches)for(const edge of edges)assert(names.has(edge.node));}
  for(const match of JSON.stringify(w.nodes).replaceAll('\\"','"').matchAll(/\$\(['"]([^'"]+)['"]\)/g))assert(names.has(match[1]),match[1]);
  assert(!JSON.stringify(w).includes('Analizar finanzas'));const agent=w.nodes.find(n=>n.type.endsWith('.agent'));assert(['NEXUS','ATLAS','ORACLE','LUMEN'].includes(agent.name));
  for(const type of ['ai_languageModel','ai_outputParser','ai_tool'])assert(Object.values(w.connections).some(c=>c[type]?.flat().some(e=>e.node===agent.name)));
 }
 assert.deepEqual(built[0].nodes.filter(n=>n.type.endsWith('.toolWorkflow')).map(n=>n.name),['Delegar a ATLAS','Delegar a ORACLE','Delegar a LUMEN']);
});
