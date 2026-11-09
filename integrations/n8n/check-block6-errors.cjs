const fs=require('fs'),assert=require('assert/strict');const scenario=process.argv[2],log=fs.readFileSync('/results/'+scenario+'.log','utf8'),trace=JSON.parse(fs.readFileSync('/tmp/backend-traces.json'));
assert(!log.includes('Paired item data'),'Item pairing error recurred');
const requestId='00000000-0000-4000-8000-'+String(600+['BADPARSE','BADREF','BADREQUEST','MULTIITEM'].indexOf(scenario)).padStart(12,'0');
if(scenario==='MULTIITEM'){assert(log.includes('Exactly one request item'));assert(!trace.some(t=>t.requestId===requestId||t.requestId==='00000000-0000-4000-8000-000000000999'));}
else{const i=log.indexOf('{\n  "data":');assert(i>=0);const run=JSON.parse(log.slice(i));assert(run.finished&&!run.data.resultData.error);const out=run.data.resultData.runData['Especialista real nativo'][0].data.main[0][0].json;assert.equal(out.status,'FAILED');assert.equal(out.requestId,requestId);assert.equal(trace.filter(t=>t.event==='fail'&&t.requestId===requestId).length,1);assert.deepEqual(out.evidenceRefs,[]);}
console.log(JSON.stringify({scenario,status:'PASS',nativeN8n:true,provider:'SIMULATED',crossRequestMixing:false}));
