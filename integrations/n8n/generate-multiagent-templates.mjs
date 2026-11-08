import fs from 'node:fs';
import {buildMultiagent} from './multiagent-workflows.mjs';
const baseline=JSON.parse(fs.readFileSync(new URL('./hybrid-rag-query.json',import.meta.url),'utf8'));
for(const [i,w] of buildMultiagent(baseline).entries())fs.writeFileSync(new URL(['multiagent-query.json','financial-agent.json','knowledge-agent.json','support-agent.json'][i],import.meta.url),JSON.stringify(w,null,2)+'\n');
console.log('Four inactive portable multiagent definitions generated; no credentials embedded.');
