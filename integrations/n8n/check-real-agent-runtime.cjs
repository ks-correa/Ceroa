const fs=require('fs'),assert=require('assert/strict');
const log=fs.readFileSync('/tmp/execute.log','utf8'),offset=log.indexOf('{\n  "data":');assert(offset>=0);const result=JSON.parse(log.slice(offset));assert.equal(result.finished,true);assert(!result.data.resultData.error);
fs.writeFileSync('/results/real-execution-'+process.argv[2]+'.json',JSON.stringify(result));
const run=result.data.resultData.runData['Analizar finanzas'];assert(run?.[0]?.data.main[0]?.[0]?.json.output,'Native final structured output missing');
const backend=JSON.parse(fs.readFileSync('/tmp/backend-traces.json','utf8'));
const scenario=process.argv[2],expected=scenario==='FINANCIAL'?'FINANCIAL':'SUPPORT';
assert(backend.some(x=>x.event==='complete'&&x.role===expected),'Expected actual specialist did not complete');
assert(!log.includes('Received tool input did not match'));assert(!log.includes('SPECIALIST_UNAVAILABLE'));
console.log(JSON.stringify({scenario,provider:'REAL_GEMINI',backend:'SIMULATED',status:'PASS',executionMs:Date.parse(result.stoppedAt)-Date.parse(result.startedAt),endToEndProduction:false}));
