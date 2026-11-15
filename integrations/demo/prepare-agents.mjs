import fs from 'node:fs';
import {buildMultiagent} from '../n8n/multiagent-workflows.mjs';
const all=buildMultiagent(JSON.parse(fs.readFileSync('integrations/n8n/hybrid-rag-query.json','utf8')));
for(const w of all){w.settings={...w.settings,saveDataSuccessExecution:'all',saveDataErrorExecution:'all',saveManualExecutions:true};for(const n of w.nodes){if(n.type.endsWith('.lmChatGoogleGemini'))n.credentials={googlePalmApi:{id:'i3ZlKFCryuyzRS4O',name:'Gemini authorized demo'}};if(n.type.includes('httpRequest')||n.type.endsWith('.webhook'))n.credentials={httpHeaderAuth:{id:'fixture-worker',name:'Synthetic demo worker'}};}}
fs.writeFileSync('tmp/functional-demo/workflows.json',JSON.stringify(all));
console.log(all.map(w=>({id:w.id,name:w.name,path:w.nodes.find(n=>n.type.endsWith('.webhook'))?.parameters.path,models:w.nodes.filter(n=>n.type.includes('lmChat')).map(n=>n.parameters)})));
