// For disposable synthetic n8n fixtures only. Never exports prompts, parameters or output values.
const fs=require('node:fs');const {DatabaseSync}=require('node:sqlite');
const scenario=process.argv[2],log=fs.readFileSync('/tmp/execute.log','utf8');const start=log.indexOf('{\n  "data":');const result=JSON.parse(log.slice(start));
const workflowId=scenario==='COMPOSITE'?'ceroaMultiagentFixture30':'ceroaMultiagentFixture30'+scenario;
const db=new DatabaseSync('/home/node/.n8n/database.sqlite',{readOnly:true});
const executions=db.prepare('SELECT id,workflowId,status,startedAt,stoppedAt FROM execution_entity ORDER BY id').all().filter(e=>Date.parse(e.startedAt)>=Date.parse(result.startedAt)-100);db.close();
const provider=JSON.parse(fs.readFileSync('/tmp/provider-traces.json','utf8')).filter(t=>t.scenario===scenario&&t.model!=='fixture-legacy').map(({model,tools,results,selectedTool})=>({model,availableTools:tools,selectedTool:selectedTool??null,toolResults:results}));
const requestId=result.data.resultData.runData['Preparar texto']?.[0]?.data?.main?.[0]?.[0]?.json?.requestId??null;
const trace={scenario,requestId,toolsInvoked:provider.map(t=>t.selectedTool).filter(Boolean),workflowId,executionId:executions.find(x=>x.workflowId===workflowId)?.id??null,executions,startedAt:result.startedAt,stoppedAt:result.stoppedAt,latencyMs:Date.parse(result.stoppedAt)-Date.parse(result.startedAt),provider:'SIMULATED',backend:'SIMULATED',finished:result.finished,sqliteStatusIsNotFinalProof:true,roles:[...new Set(provider.map(t=>t.model).filter(m=>m!=='fixture-root'))],delegations:provider.filter(t=>t.model==='fixture-root').length-1,providerRequests:provider.length,providerTrace:provider};
fs.writeFileSync('/results/'+scenario+'.json',JSON.stringify(trace,null,2)+'\n');
