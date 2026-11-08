import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {ids} from './multiagent-workflows.mjs';
const [beforePath,afterPath,reportPath]=process.argv.slice(2);
const before=JSON.parse(fs.readFileSync(beforePath,'utf8')),after=JSON.parse(fs.readFileSync(afterPath,'utf8'));
const definition=w=>({id:w.id,name:w.name,nodes:w.nodes,connections:w.connections,settings:w.settings});
const hash=w=>createHash('sha256').update(JSON.stringify(definition(w))).digest('hex');
const rootId='ceroaHybridQuery20',root=after.find(w=>w.id===rootId),previous=before.find(w=>w.id===rootId);
assert(root&&previous);const preserved=[];
for(const old of before.filter(w=>w.id!==rootId)){const current=after.find(w=>w.id===old.id);assert(current,'Missing '+old.id);assert.deepEqual(definition(current),definition(old),'Unrelated workflow changed: '+old.id);preserved.push({id:old.id,sha256:hash(current)});}
const roots=root.nodes.filter(n=>n.type.endsWith('.toolWorkflow'));assert.equal(roots.length,3);assert(!root.nodes.some(n=>n.type.endsWith('.httpRequestTool')));
for(const [role,id] of Object.entries(ids)){const child=after.find(w=>w.id===id);assert(child,'Missing specialist '+role);assert.equal(child.nodes.filter(n=>n.type.endsWith('.agent')).length,1);assert(!child.nodes.some(n=>n.type.endsWith('.webhook')||n.type.endsWith('.toolWorkflow')||n.type.endsWith('.code')));assert.deepEqual(child.nodes.find(n=>n.type.endsWith('.lmChatGoogleGemini')).credentials,previous.nodes.find(n=>n.type.endsWith('.lmChatGoogleGemini')).credentials);}
assert.deepEqual(root.nodes.find(n=>n.type.endsWith('.webhook')),previous.nodes.find(n=>n.type.endsWith('.webhook')));
for(const n of previous.nodes.filter(n=>n.type.endsWith('.code')))assert.deepEqual(root.nodes.find(x=>x.id===n.id),n,'Critical validator changed '+n.name);
const count=list=>({workflows:list.length,nodes:list.reduce((s,w)=>s+w.nodes.length,0),codeNodes:list.reduce((s,w)=>s+w.nodes.filter(n=>n.type.endsWith('.code')).length,0)});
const report={before:count(before),after:count(after),specialists:Object.entries(ids).map(([role,id])=>({role,id,nodes:after.find(w=>w.id===id).nodes.length})),unchanged:preserved,rootWebhookPreserved:true,criticalCodePreserved:true,providerVerification:'PENDING_API_KEY_INVALID',note:'Definition reconciliation, not proof of real provider execution.'};
if(reportPath)fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,unchanged:preserved.length}));
