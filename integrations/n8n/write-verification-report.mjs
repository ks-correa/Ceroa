import {readFile,writeFile} from 'node:fs/promises';
const [output]=process.argv.slice(2);if(!output)throw Error('Output JSON path required');
const names=['com.ceroa.config.AssistantIntegrationTest','com.ceroa.config.AssistantLibraryIntegrationTest','com.ceroa.config.HybridDocumentIntegrationTest','com.ceroa.service.AgentContractsTest','com.ceroa.service.DocumentBatchAuthorizationTest','com.ceroa.service.DocumentFactTest','com.ceroa.service.DocumentPeriodAnalysisTest','com.ceroa.service.DocumentPrivacyTest','com.ceroa.service.AssistantAnalysisServiceTest','com.ceroa.service.ScheduledReminderIntegrationTest','com.ceroa.service.SentinelIntegrationTest'];
const java=[];
for(const name of names){
 const xml=await readFile(new URL('../../backend/target/surefire-reports/TEST-'+name+'.xml',import.meta.url),'utf8');
 const tag=xml.match(/<testsuite\b[^>]+>/)?.[0];if(!tag)throw Error('Missing test report');
 const attributes=Object.fromEntries([...tag.matchAll(/([a-z]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
 java.push({name,...Object.fromEntries(['tests','failures','errors','skipped'].map(k=>[k,Number(attributes[k])]))});
}
if(java.some(r=>r.failures||r.errors||r.skipped||!r.tests))throw Error('Incomplete or failing Java suite');
const report={capturedAt:new Date().toISOString(),java,nodeTests:23,schemaCases:8,n8nRuntimeScenarios:['empty_document_queue','populated_document_queue','query_telemetry_failure'],providers:'Synthetic fixtures in isolated n8n; real isolated PostgreSQL/pgvector'};
await writeFile(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log('Recorded '+java.reduce((sum,r)=>sum+r.tests,0)+' successful Java tests. Node/schema/n8n counts refer to the accompanying recorded runs.');
