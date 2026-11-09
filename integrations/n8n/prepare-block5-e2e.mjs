// Isolated Spring/H2 + actual Gemini. Run prepare-real-agent-verification first for encrypted credentials.
import fs from 'node:fs';import path from 'node:path';
import {buildMultiagent} from './multiagent-workflows.mjs';
const dir=path.resolve(process.argv[2]??'');if(!dir.includes(path.sep+'tmp'+path.sep))throw Error('Private tmp directory required');
const workflows=buildMultiagent(JSON.parse(fs.readFileSync(new URL('./hybrid-rag-query.json',import.meta.url))));
const lm=JSON.parse(fs.readFileSync(path.join(dir,'workflows.json'))).flatMap(w=>w.nodes).find(n=>n.name==='Gemini Ceroa');
if(!lm?.credentials?.googlePalmApi)throw Error('Existing real encrypted provider fixture required');
for(const w of workflows){
 w.settings={...w.settings,saveDataSuccessExecution:'all',saveDataErrorExecution:'all',saveManualExecutions:true};
 w.nodes=w.nodes.filter(n=>n.id!=='mcp-public');delete w.connections['Consultar capacidad externa MCP'];
 for(const n of w.nodes){
  if(n.type.endsWith('.webhook'))n.credentials={httpHeaderAuth:{id:'fixture-worker',name:'Synthetic worker'}};
  if(n.type.endsWith('.lmChatGoogleGemini'))n.credentials=structuredClone(lm.credentials);
  if(n.type.includes('httpRequest')){n.parameters.url=n.parameters.url.replaceAll('http://backend:8080','http://ceroa-block5-e2e-backend:8080');n.credentials={httpHeaderAuth:{id:'fixture-worker',name:'Synthetic worker'}};}
 }
}
const credentials=JSON.parse(fs.readFileSync(path.join(dir,'credentials.json')));credentials.find(c=>c.id==='fixture-worker').data.value='synthetic-worker-only-at-least-32-characters';
fs.writeFileSync(path.join(dir,'e2e-credentials.json'),JSON.stringify(credentials),{mode:0o600});
fs.writeFileSync(path.join(dir,'e2e-workflows.json'),JSON.stringify(workflows),{mode:0o600});
