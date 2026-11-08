import fs from 'node:fs';
import {buildMultiagent} from './multiagent-workflows.mjs';
import {scopedMcpClientWorkflow} from './workspace-mcp.mjs';
const dir=process.argv[2];fs.mkdirSync(dir,{recursive:true});
const original=JSON.parse(fs.readFileSync(new URL('./hybrid-rag-query.json',import.meta.url),'utf8'));
const all=buildMultiagent(original);
const [root,...children]=all;
all.push(scopedMcpClientWorkflow());
const edge=node=>({node,type:'main',index:0});
const keep=['Analizar finanzas','Gemini Ceroa','Contrato de respuesta',...root.nodes.filter(n=>n.type.endsWith('.toolWorkflow')).map(n=>n.name)];
root.nodes=root.nodes.filter(n=>keep.includes(n.name));
root.connections=Object.fromEntries(Object.entries(root.connections).filter(([name])=>keep.includes(name)).map(([k,v])=>[k,Object.fromEntries(Object.entries(v).map(([type,arr])=>[type,arr.map(outputs=>outputs.filter(e=>keep.includes(e.node)))]))]));
root.id='ceroaMultiagentFixture30';root.name='Isolated actual native agents with simulated provider';
root.nodes.find(n=>n.name==='Analizar finanzas').parameters.options.maxIterations=4;
root.nodes.push({id:'entry',name:'Inicio de prueba',type:'n8n-nodes-base.manualTrigger',typeVersion:1,parameters:{},position:[0,0]});
const sets=[['Preparar texto',{requestId:'00000000-0000-4000-8000-000000000001',message:'SCENARIO_COMPOSITE',year:2026,month:11,conversation:[]}],['Preparar contexto en Spring Boot',{facts:{}}],['Iniciar orquestación autorizada',{schemaVersion:'1.1'}]];
let prev='Inicio de prueba';for(const [name,value] of sets){root.nodes.push({id:name,name,type:'n8n-nodes-base.set',typeVersion:3.4,parameters:{mode:'raw',jsonOutput:JSON.stringify(value),options:{}},position:[240+sets.findIndex(s=>s[0]===name)*200,0]});root.connections[prev]={main:[[edge(name)]]};prev=name;}root.connections[prev]={main:[[edge('Analizar finanzas')]]};
const legacy=structuredClone(root);legacy.id='ceroaLegacyFixture30';legacy.name='Previous published single-agent architecture, synthetic benchmark only';
legacy.nodes=legacy.nodes.filter(n=>!n.type.endsWith('.toolWorkflow'));for(const name of Object.keys(legacy.connections))if(!legacy.nodes.some(n=>n.name===name))delete legacy.connections[name];
legacy.nodes.find(n=>n.name==='Analizar finanzas').parameters=structuredClone(original.nodes.find(n=>n.name==='Analizar finanzas').parameters);legacy.nodes.find(n=>n.name==='Analizar finanzas').parameters.options.maxIterations=4;
for(const tool of original.nodes.filter(n=>n.type.endsWith('.httpRequestTool'))){const n=structuredClone(tool);n.parameters.sendQuery=true;n.parameters.queryParameters??={parameters:[]};n.parameters.queryParameters.parameters.push({name:'scope',value:'synthetic-legacy-fixture'});legacy.nodes.push(n);legacy.connections[n.name]={ai_tool:[[{node:'Analizar finanzas',type:'ai_tool',index:0}]]};}
all.push(legacy);
for(const w of all){
 for(const n of w.nodes){
  if(n.type.endsWith('.lmChatGoogleGemini')){n.type='@n8n/n8n-nodes-langchain.lmChatOpenAi';n.typeVersion=1.2;n.parameters={model:{__rl:true,value:w===root?'fixture-root':w===legacy?'fixture-legacy':w.id,mode:'id'},options:{baseURL:'http://127.0.0.1:18080/v1',temperature:0,maxRetries:0,timeout:10000}};n.credentials={openAiApi:{id:'fixture-openai',name:'Fixture only'}};}
  if(n.type.includes('httpRequest')){n.parameters.url=n.parameters.url.replaceAll('http://backend:8080','http://127.0.0.1:18080');if(n.id==='fail'){n.parameters.sendBody=true;n.parameters.specifyBody='json';n.parameters.jsonBody='={{ JSON.stringify($json) }}';}n.credentials={httpHeaderAuth:{id:'fixture-worker',name:'Fixture only'}};}
 }
}
const variants=['FINANCIAL','RAG','SUPPORT','UNKNOWN','EXTRACTS'].map(scenario=>{
 const copy=structuredClone(root);copy.id='ceroaMultiagentFixture30'+scenario;
 copy.nodes.find(n=>n.name==='Preparar texto').parameters.jsonOutput=JSON.stringify({requestId:'00000000-0000-4000-8000-'+String(['FINANCIAL','RAG','SUPPORT','UNKNOWN'].indexOf(scenario)+2).padStart(12,'0'),message:'SCENARIO_'+scenario,year:2026,month:11,conversation:[]});return copy;
});
const previous=['COMPOSITE','FINANCIAL','RAG','EXTRACTS'].map(scenario=>{const w=structuredClone(legacy);w.id+=scenario;w.nodes.find(n=>n.name==='Preparar texto').parameters.jsonOutput=JSON.stringify({requestId:'00000000-0000-4000-8000-000000000020',message:'SCENARIO_'+scenario,year:2026,month:11,conversation:[]});return w;});
fs.writeFileSync(dir+'/workflows.json',JSON.stringify([...all,...variants,...previous],null,2));
fs.writeFileSync(dir+'/credentials.json',JSON.stringify([{id:'fixture-openai',name:'Fixture only',type:'openAiApi',data:{apiKey:'synthetic-only',url:'http://127.0.0.1:18080/v1'}},{id:'fixture-worker',name:'Fixture only',type:'httpHeaderAuth',data:{name:'X-Ceroa-Assistant',value:'synthetic-worker-only'}}]));
