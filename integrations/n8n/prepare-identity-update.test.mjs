import test from 'node:test';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
import {prepareIdentityUpdate} from './prepare-identity-update.mjs';
const files=['multiagent-query.json','financial-agent.json','knowledge-agent.json','support-agent.json'];
const legacy=files.map(file=>JSON.parse(execFileSync('git',['show','8c6ac23:integrations/n8n/'+file],{encoding:'utf8'})));
test('selective identity patch preserves authoritative runtime values and deliberate MCP absence',()=>{
 const source=structuredClone(legacy);const support=source.find(w=>w.id==='ceroaSupportAgent30');support.nodes=support.nodes.filter(n=>n.id!=='mcp-public');delete support.connections['Consultar capacidad externa MCP'];
 const root=source[0];root.nodes.push({id:'custom-error',name:'Fallo · Runtime · Analizar finanzas',type:'n8n-nodes-base.noOp',parameters:{},position:[0,0]});root.connections['Fallo · Runtime · Analizar finanzas']={main:[[{node:'Analizar finanzas',type:'main',index:0}]]};
 for(const w of source){w.active=true;w.versionId='recoverable-version';w.activeVersionId='published-version';for(const n of w.nodes)n.credentials={synthetic:{id:'KEEP',name:'Agente Soporte'}};}
 const before=structuredClone(source),after=prepareIdentityUpdate(source);assert.deepEqual(source,before);
 for(const [i,w] of after.entries()){
  for(const [key,value] of Object.entries(before[i]))if(!['name','nodes','connections'].includes(key))assert.deepEqual(w[key],value);
  for(const n of before[i].nodes){const changed=w.nodes.find(x=>x.id===n.id);for(const [key,value] of Object.entries(n))if(!['name','notes','notesInFlow','parameters'].includes(key))assert.deepEqual(changed[key],value);}
 }
 assert(!after.find(w=>w.id==='ceroaSupportAgent30').nodes.some(n=>n.id==='mcp-public'));
 assert.deepEqual(prepareIdentityUpdate(after),after,'Patch is idempotent');
});
test('invalid sources fail closed and unrelated workflows remain identical',()=>{
 const unrelated={id:'unrelated',name:'KEEP',active:false,nodes:[],connections:{}};assert.deepEqual(prepareIdentityUpdate([unrelated]),[unrelated]);
 const bad=structuredClone(legacy[0]);bad.connections.ghost={main:[[{node:'absent'}]]};assert.throws(()=>prepareIdentityUpdate([bad]));
});
