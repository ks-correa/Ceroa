// Disposable n8n runtime probe. Never imports production IDs or uses credentials.
import {readFile,writeFile} from 'node:fs/promises';
const [output,scenario='empty']=process.argv.slice(2);if(!output||!['empty','populated'].includes(scenario))throw Error('Output file and empty|populated scenario required');
const worker=JSON.parse(await readFile(new URL('document-processor.json',import.meta.url),'utf8'));
worker.id='ceroaFixtureWorker22';worker.name='TEST ONLY - Empty document queue';
const config={id:'financial-library-v1',embedding_model:'gemini-embedding-001',dimensions:768,schema_version:21,max_file_bytes:8388608,max_pages:25};
const job={jobId:'00000000-0000-4000-8000-000000000001',attempt:2,chunks:[{text:'Synthetic evidence',location:'page 1'}],model:'gemini-embedding-001'};
const replacements=[['supabase-config',config],['claim',scenario==='empty'?{}:job]];
if(scenario==='populated')replacements.push(['extract',{output:{proposals:[]}}],['embed',{embedding:{values:Array(768).fill(.25)}}]);
for(const [id,value] of replacements){
 const n=worker.nodes.find(n=>n.id===id);n.type='n8n-nodes-base.set';n.typeVersion=3.4;n.parameters={mode:'raw',jsonOutput:JSON.stringify(value),options:{}};
 delete n.retryOnFail;delete n.maxTries;delete n.waitBetweenTries;
}
if(scenario==='populated'){
  worker.nodes=worker.nodes.filter(n=>!['model','schema'].includes(n.id));
  delete worker.connections['Gemini metadatos'];delete worker.connections['Contrato de propuestas'];
  const persist=worker.nodes.find(n=>n.id==='persist');persist.type='n8n-nodes-base.set';persist.typeVersion=3.4;
  persist.parameters={mode:'raw',jsonOutput:'={{ JSON.stringify({fixturePersisted:true,jobId:$json.jobId,attempt:$json.attempt,vectorCount:$json.vectors.length}) }}',options:{}};
}
const adapter=JSON.parse(await readFile(new URL('hybrid-rag-sync.json',import.meta.url),'utf8'));
adapter.id='ceroaFixtureCaller22';adapter.name='TEST ONLY - Shared worker caller';
adapter.nodes[0].type='n8n-nodes-base.manualTrigger';adapter.nodes[0].typeVersion=1;adapter.nodes[0].parameters={};
adapter.nodes[1].parameters.workflowId.value=worker.id;
await writeFile(output,JSON.stringify([worker,adapter],null,2)+'\n',{flag:'wx'});
