import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import assert from 'node:assert/strict';
import {buildMultiagent} from './multiagent-workflows.mjs';
const templates=()=>buildMultiagent(JSON.parse(fs.readFileSync(new URL('./hybrid-rag-query.json',import.meta.url))));
/** Change only existing conversational workflows; preserve live tool configuration and credentials. */
export function patchBlock6(authoritative){
 return templates().map(template=>{
  const live=authoritative.find(w=>w.id===template.id);assert(live,'Existing conversation workflow required');const w=structuredClone(live);
  const agent=w.nodes.find(n=>n.type.endsWith('.agent')),next=template.nodes.find(n=>n.type.endsWith('.agent'));assert(agent&&next);
  agent.parameters.options.systemMessage=next.parameters.options.systemMessage;
  if(w.id==='ceroaHybridQuery20')return w;
  agent.onError='continueRegularOutput';
  w.nodes.find(n=>n.type.endsWith('.outputParserStructured')).parameters.inputSchema=template.nodes.find(n=>n.type.endsWith('.outputParserStructured')).parameters.inputSchema;
  for(const id of ['cached','finish','fail']){
   const n=w.nodes.find(n=>n.id===id),replacement=template.nodes.find(n=>n.id===id);assert(n&&replacement);
   if(id==='cached')n.parameters=replacement.parameters;
   else if(id==='finish')n.onError='continueRegularOutput';
   else for(const key of ['sendBody','specifyBody','jsonBody'])n.parameters[key]=replacement.parameters[key];
  }
  for(const id of ['single','reject','output','accepted','returned']){assert(!w.nodes.some(n=>n.id===id),'Already patched; reconcile rather than duplicate nodes');w.nodes.push(structuredClone(template.nodes.find(n=>n.id===id)));}
  const toolNames=new Set(w.nodes.filter(n=>n.type.endsWith('.httpRequestTool')||n.type.endsWith('.toolWorkflow')).map(n=>n.name));
  const original=w.connections;
  w.connections=Object.fromEntries(Object.entries(template.connections).filter(([name])=>!template.nodes.some(n=>n.name===name&&(n.type.endsWith('.httpRequestTool')||n.type.endsWith('.toolWorkflow')))));
  for(const name of toolNames)if(original[name])w.connections[name]=original[name];
  return w;
 });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [input,out]=process.argv.slice(2);assert(input&&out);fs.mkdirSync(out,{recursive:true});for(const w of patchBlock6(JSON.parse(fs.readFileSync(input))))fs.writeFileSync(path.join(out,w.id+'.json'),JSON.stringify(w,null,2),{mode:0o600});
}
