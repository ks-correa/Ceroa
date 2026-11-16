import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {digest,inspect} from './bootstrap.mjs';
const manifest=JSON.parse(fs.readFileSync(new URL('./workflows.manifest.json',import.meta.url)));const workflows=manifest.workflows.map(e=>JSON.parse(fs.readFileSync(new URL('./workflows/'+e.file,import.meta.url))));
test('definitive exports have verified hashes, stable references and logical credentials only',()=>{
 inspect(manifest,workflows);const paths=new Set();assert.equal(workflows.length,26);
 for(const entry of manifest.workflows){const bytes=fs.readFileSync(new URL('./workflows/'+entry.file,import.meta.url),'utf8');assert.equal(digest(bytes),entry.sha256);const w=workflows.find(x=>x.id===entry.id);assert.equal(w.active,false);assert.equal(w.pinData,undefined);assert.equal(w.staticData,undefined);
  const names=new Set(w.nodes.map(n=>n.name));for(const n of w.nodes){for(const c of Object.values(n.credentials??{}))assert.deepEqual(Object.keys(c),['name']);
   if(n.type==='n8n-nodes-base.webhook'){const key=n.parameters.httpMethod+':'+n.parameters.path;assert(!paths.has(key));paths.add(key);assert.equal(n.parameters.authentication,'headerAuth');}
  }
  for(const match of JSON.stringify(w.nodes).replaceAll('\\"','"').matchAll(/\$\(['"]([^'"]+)['"]\)/g))assert(names.has(match[1]),w.id+':'+match[1]);
 }
});
test('only four cognitive agents remain and external consumers cannot publish automatically',()=>{
 const agents=workflows.flatMap(w=>w.nodes.filter(n=>n.type==='@n8n/n8n-nodes-langchain.agent').map(n=>n.name));assert.deepEqual(agents.sort(),['ATLAS','LUMEN','NEXUS','ORACLE']);
 for(const e of manifest.workflows.filter(x=>x.externalEffects))assert.equal(e.publication,'manual');assert.equal(manifest.workflows.find(e=>e.id==='ceroaWorkspaceSheets40').disabled,true);
 for(const id of ['ceroaRagIndex03','ceroaGoogleDraftFinal','ceroaGoogleCalendarFinal'])assert(manifest.workflows.some(e=>e.id===id));
});
