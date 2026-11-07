const fs=require('fs');
const raw=fs.readFileSync('/tmp/execute.log','utf8');
const start=raw.indexOf('{\n  "data":');
if(start<0)throw Error('Missing execution result');
const execution=JSON.parse(raw.slice(start));
if(execution.status!=='success'||!execution.finished)throw Error('Caller did not finish');
// Child execution data is stored separately; parent output proves a completed
// synchronous call, including the validated lease and vector count for a job.
const runs=execution.data.resultData.runData;
const output=runs['Ejecutar procesador compartido'][0].data.main[0];
const fixture=JSON.parse(fs.readFileSync('/fixtures/runtime-fixture.json','utf8'));
const populated=JSON.parse(fixture[0].nodes.find(n=>n.id==='claim').parameters.jsonOutput).jobId!==undefined;
if(populated&&!output.length)throw Error('Populated pipeline returned no result');
if(!populated&&output.length)throw Error('Empty pipeline unexpectedly produced a result');
if(output.length){const result=output[0].json;if(result.fixturePersisted!==true||result.attempt!==2||result.vectorCount!==1)throw Error('Invalid synthetic processing result');}
console.log(output.length?'PASS: populated shared pipeline, validated vectors and lease.':'PASS: empty queue, synchronous shared workflow execution.');
