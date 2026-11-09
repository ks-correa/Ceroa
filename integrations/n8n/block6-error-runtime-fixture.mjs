import fs from 'node:fs';import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const dir=process.argv[2];if(!dir)throw Error('Private fixture directory required');
execFileSync(process.execPath,[fileURLToPath(new URL('./multiagent-runtime-fixture.mjs',import.meta.url)),dir]);
const workflows=JSON.parse(fs.readFileSync(dir+'/workflows.json'));
const edge=node=>({node,type:'main',index:0});
for(const [i,scenario]of ['BADPARSE','BADREF','BADREQUEST','MULTIITEM'].entries()){
 const item={requestId:'00000000-0000-4000-8000-'+String(600+i).padStart(12,'0'),task:'SCENARIO_'+scenario,evidenceRefs:[],context:{year:2026,month:11}};
 const seed={id:'seed',name:'Solicitud sintetica',type:'n8n-nodes-base.set',typeVersion:3.4,position:[200,0],parameters:{mode:'raw',jsonOutput:JSON.stringify(scenario==='MULTIITEM'?{items:[item,{...item,requestId:'00000000-0000-4000-8000-000000000999'}]}:item),options:{}}};
 const entry={id:'entry',name:'Inicio',type:'n8n-nodes-base.manualTrigger',typeVersion:1,position:[0,0],parameters:{}};
 const invoke={id:'invoke',name:'Especialista real nativo',type:'n8n-nodes-base.executeWorkflow',typeVersion:1.3,position:[600,0],parameters:{source:'database',workflowId:{__rl:true,value:'ceroaFinancialAgent30',mode:'id'},mode:'once',options:{waitForSubWorkflow:true}}};
 const nodes=[entry,seed,invoke],connections={[entry.name]:{main:[[edge(seed.name)]]},[seed.name]:{main:[[edge(invoke.name)]]}};
 if(scenario==='MULTIITEM'){const split={id:'split',name:'Dos solicitudes incompatibles',type:'n8n-nodes-base.splitOut',typeVersion:1,position:[400,0],parameters:{fieldToSplitOut:'items',options:{}}};nodes.push(split);connections[seed.name]={main:[[edge(split.name)]]};connections[split.name]={main:[[edge(invoke.name)]]};}
 workflows.push({id:'ceroaBlock6Error'+scenario,name:'Block 6 error '+scenario,active:false,nodes,connections,settings:{executionOrder:'v1'}});
}
fs.writeFileSync(dir+'/workflows.json',JSON.stringify(workflows));
