import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {patchBlock5} from './prepare-block5-runtime.mjs';import {buildMultiagent} from './multiagent-workflows.mjs';import {driveWorkflow} from './workspace-drive.mjs';
test('Block 5 patches preserve authoritative credentials, tools, graphs and inactive connectors',()=>{
 const baseline=JSON.parse(fs.readFileSync(new URL('./hybrid-rag-query.json',import.meta.url)));
 const original=[...buildMultiagent(baseline),driveWorkflow()];
 original.forEach(w=>w.nodes.forEach(n=>n.credentials={synthetic:{id:'preserve-this'}}));
 const before=structuredClone(original),patched=patchBlock5(original);
 assert.deepEqual(original,before);assert.equal(patched.length,4);
 for(const w of patched){const previous=original.find(v=>v.id===w.id);assert.deepEqual(w.connections,previous.connections);assert.equal(w.active,previous.active);
  for(const n of w.nodes){const old=previous.nodes.find(v=>v.id===n.id);assert.deepEqual(n.credentials,old.credentials);if(!n.type.endsWith('.agent')&&!n.type.endsWith('.outputParserStructured')&&n.id!=='validate')assert.deepEqual(n,old);}
 }
 assert.throws(()=>patchBlock5(original.map(w=>w.id==='ceroaWorkspaceDrive40'?{...w,active:true}:w)));
});
