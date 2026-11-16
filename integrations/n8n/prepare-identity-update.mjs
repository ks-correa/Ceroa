import fs from 'node:fs';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
import {identifyCeroa} from './ceroa-identity.mjs';
const ids=new Set(['ceroaHybridQuery20','ceroaFinancialAgent30','ceroaKnowledgeAgent30','ceroaSupportAgent30']);
const labels=new Map([['ceroaWorkspaceCalendar40','CEROA AI | CHRONOS — Scheduling & External Integration'],['ceroaMcpClient40','CEROA AI | CHRONOS — MCP Client'],['ceroaMcpSupport40','CEROA AI | CHRONOS — Scoped MCP Support']]);
function validate(w){
 const names=new Set(w.nodes.map(n=>n.name));assert.equal(names.size,w.nodes.length,'Duplicate node name');
 for(const [from,types] of Object.entries(w.connections)){assert(names.has(from),'Missing source '+from);for(const branches of Object.values(types))for(const edges of branches)for(const e of edges)assert(names.has(e.node),'Missing target '+e.node);}
 const walk=v=>{if(typeof v==='string')for(const m of v.matchAll(/\$\(['"]([^'"]+)['"]\)/g))assert(names.has(m[1]),'Unresolved expression '+m[1]);else if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')Object.values(v).forEach(walk);};w.nodes.forEach(n=>walk(n.parameters));
}
/** Offline transformation only: input must be an authoritative export, never a portable overlay. No network/publish code. */
export function prepareIdentityUpdate(authoritative){
 return authoritative.map(source=>{
  if(!ids.has(source.id)){const copy=structuredClone(source);if(labels.has(source.id))copy.name=labels.get(source.id);return copy;}
  validate(source);
  const sanitized={id:source.id,nodes:source.nodes.map(n=>({id:n.id,name:n.name,type:n.type,parameters:n.parameters,notes:n.notes,notesInFlow:n.notesInFlow})),connections:source.connections};
  // Undefined optional notes do not belong in the export.
  const identified=identifyCeroa([JSON.parse(JSON.stringify(sanitized))])[0];
  const w=structuredClone(source);w.name=identified.name;w.connections=identified.connections;
  w.nodes=identified.nodes.map(next=>{const old=source.nodes.find(n=>n.id===next.id);if(!old)return next;return {...structuredClone(old),name:next.name,parameters:next.parameters,...(next.notes!==undefined?{notes:next.notes}:{}),...(next.notesInFlow!==undefined?{notesInFlow:next.notesInFlow}:{})};});
  assert.deepEqual(w.nodes.filter(n=>n.id==='mcp-public'),source.nodes.filter(n=>n.id==='mcp-public'),'MCP configuration may not change');
  validate(w);return w;
 });
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('Expected authoritative export and NEW local output path');
 const original=JSON.parse(fs.readFileSync(input,'utf8'));if(!Array.isArray(original))throw Error('Export must be an array');
 fs.writeFileSync(output,JSON.stringify(prepareIdentityUpdate(original),null,2)+'\n',{flag:'wx',mode:0o600});console.log('Offline identity proposal prepared; no import, activation or publication performed.');
}
