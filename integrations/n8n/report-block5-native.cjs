// Read-only disposable n8n SQLite snapshot; exports timing/counters only.
const fs=require('fs'),{DatabaseSync}=require('node:sqlite');
const file=process.argv[2],output=process.argv[3];if(!file||!output)throw Error('Snapshot and public output required');
const db=new DatabaseSync(file,{readOnly:true});
function decode(raw){const values=JSON.parse(raw),cache=new Map();const at=i=>{if(cache.has(i))return cache.get(i);const v=values[i];if(v===null||typeof v!=='object')return v;const out=Array.isArray(v)?[]:{};cache.set(i,out);for(const [k,x]of Object.entries(v))out[k]=typeof x==='string'&&/^\d+$/.test(x)?at(Number(x)):x;return out;};return at(0);}
const workflows=new Map(db.prepare('SELECT id,workflowId FROM execution_entity').all().map(r=>[String(r.id),r.workflowId]));
const roles={ceroaHybridQuery20:'ORCHESTRATOR',ceroaFinancialAgent30:'FINANCIAL',ceroaKnowledgeAgent30:'RAG',ceroaSupportAgent30:'SUPPORT'};
const rows=[];for(const r of db.prepare('SELECT executionId,data FROM execution_data').all()){
 const role=roles[workflows.get(String(r.executionId))];if(!role)continue;
 const data=decode(r.data),runs=data.resultData?.runData??{},models=runs['Gemini Ceroa']??[];
 rows.push({role,nativeModelInvocations:models.length,modelNodeMs:models.reduce((s,v)=>s+(v.executionTime??0),0),modelNodeErrors:models.filter(v=>v.error).length,executionError:!!data.resultData?.error});
}
db.close();fs.writeFileSync(output,JSON.stringify({scope:'Disposable n8n real Gemini executions, including initial quota failures and paced checks',exactProviderHttpCalls:null,notes:['Native language-model node invocations are observed, not inferred from tool counts.','Node duration includes transport and SDK overhead; provider-only latency and hidden retries remain unknown.','Root, specialist and tool durations can overlap and must not be summed as total latency.'],observations:rows},null,2)+'\n');console.log(JSON.stringify({observedExecutions:rows.length,nativeModelInvocations:rows.reduce((s,r)=>s+r.nativeModelInvocations,0)}));
