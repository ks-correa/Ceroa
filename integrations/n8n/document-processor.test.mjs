import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {shareDocumentProcessor} from './document-processor.mjs';
const load=async file=>JSON.parse(await readFile(new URL(file,import.meta.url),'utf8'));
test('both adapters call one worker and retain the original channel contract',async()=>{
  const worker=await load('document-processor.json');
  for(const file of ['hybrid-rag-ingestion.json','hybrid-rag-sync.json']){
    const w=await load(file);assert.equal(w.nodes.length,2);
    assert.equal(w.nodes[1].parameters.workflowId.value,worker.id);
    assert.equal(w.nodes[1].parameters.options.waitForSubWorkflow,true);
  }
  assert.equal(worker.nodes.find(n=>n.id==='entry').type,'n8n-nodes-base.executeWorkflowTrigger');
  assert.equal(worker.nodes.filter(n=>n.id==='claim').length,1);
  assert.equal((await load('hybrid-rag-ingestion.json')).nodes[0].parameters.path,'ceroa-library-ingest-v1');
});
test('shared worker rejects absent, malformed and incomplete vector evidence before persistence',async()=>{
  const w=await load('document-processor.json');
  const code=id=>w.nodes.find(n=>n.id===id).parameters.jsCode;
  const guard=new Function('$json',code('guard'));
  assert.deepEqual(guard({}),[]);
  assert.throws(()=>guard({jobId:'foreign',chunks:[],model:'other'}));
  const job={jobId:'00000000-0000-4000-8000-000000000001',attempt:2,chunks:[{text:'evidence'}],model:'gemini-embedding-001'};
  assert.deepEqual(guard(job),[{json:job}]);
  const part={json:{...job,order:0,proposals:[]}};
  const validate=new Function('$input','$',code('vectors'));
  const run=values=>validate({all:()=>values.map(values=>({json:{embedding:{values}}}))},()=>({all:()=>[part]}));
  assert.throws(()=>run([]));assert.throws(()=>run([[1,2]]));assert.throws(()=>run([Array(768).fill(0)]));
  const vector=Array(768).fill(.25);const [out]=run([vector]);
  assert.equal(out.json.attempt,2);assert.equal(out.json.jobId,job.jobId);assert.deepEqual(out.json.vectors,[{order:0,values:vector}]);
});
test('divergent published processing cannot be silently merged',()=>{
  const trigger={id:'entry',name:'start'};
  const a={nodes:[trigger,{id:'guard',parameters:{a:1}}],connections:{start:{main:[]}}};
  const b=structuredClone(a);b.nodes[1].parameters.a=2;
  assert.throws(()=>shareDocumentProcessor(a,b),/reconcile/);
});
test('startup never publishes a draft',async()=>{
  const script=await readFile(new URL('start-n8n.sh',import.meta.url),'utf8');
  assert.doesNotMatch(script,/n8n\s+(publish|import|update):/);
});
