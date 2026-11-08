import fs from 'node:fs';
import {buildMultiagent} from './multiagent-workflows.mjs';
const dir=process.argv[2];const workflows=buildMultiagent(JSON.parse(fs.readFileSync(new URL('./hybrid-rag-query.json',import.meta.url),'utf8')));
for(const w of workflows){for(const n of w.nodes){
 if(n.type.endsWith('.webhook'))n.credentials={httpHeaderAuth:{id:'fixture-worker',name:'Synthetic only'}};
 if(n.type.endsWith('.lmChatGoogleGemini')){n.type='@n8n/n8n-nodes-langchain.lmChatOpenAi';n.typeVersion=1.2;n.parameters={model:{__rl:true,value:w===workflows[0]?'fixture-root':w.id,mode:'id'},options:{baseURL:'http://127.0.0.1:18080/v1',maxRetries:0,temperature:0}};n.credentials={openAiApi:{id:'fixture-openai',name:'Synthetic only'}};}
 if(n.type.includes('httpRequest')){n.parameters.url=n.parameters.url.replaceAll('http://backend:8080','http://ceroa-multiagent-backend:8080');n.credentials={httpHeaderAuth:{id:'fixture-worker',name:'Synthetic only'}};}
}}
fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(dir+'/workflows.json',JSON.stringify(workflows));
fs.writeFileSync(dir+'/credentials.json',JSON.stringify([{id:'fixture-worker',name:'Synthetic only',type:'httpHeaderAuth',data:{name:'X-Ceroa-Assistant',value:'synthetic-worker-only-at-least-32-characters'}},{id:'fixture-openai',name:'Synthetic only',type:'openAiApi',data:{apiKey:'synthetic-only',url:'http://127.0.0.1:18080/v1'}}]));
