// Read-only availability baseline. Emits timings and status, never response bodies or keys.
import {readFile,writeFile} from 'node:fs/promises';
const [outputPath]=process.argv.slice(2);
if(!outputPath)throw Error('Usage: node probe-runtime.mjs OUTPUT_JSON');
const env=Object.fromEntries((await readFile(new URL('../../.env',import.meta.url),'utf8')).split(/\r?\n/).filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).replace(/^['"]|['"]$/g,'')]));
if(!env.DOCUMENT_LIBRARY_WORKER_KEY)throw Error('Existing library worker key required');
const probes=[];
for(const [name,url,headers] of [
 ['csrf','http://localhost:8080/api/v1/auth/csrf',{}],
 ['n8nReadiness','http://localhost:5678/healthz/readiness',{}],
 ['ragConfiguration','http://localhost:8080/api/v1/library-supabase/rest/v1/ceroa_rag_configuration?id=eq.financial-library-v1',{apikey:env.DOCUMENT_LIBRARY_WORKER_KEY}],
]){
 const start=performance.now();
 try{const response=await fetch(url,{headers,signal:AbortSignal.timeout(15000)});await response.arrayBuffer();probes.push({name,status:response.status,elapsedMs:Math.round(performance.now()-start)});}
 catch{probes.push({name,status:0,elapsedMs:Math.round(performance.now()-start)});}
}
const result={capturedAt:new Date().toISOString(),scope:'Read-only availability; not conversational or RAG latency',probes};
await writeFile(outputPath,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(result));
if(probes.some(p=>p.status!==200))process.exitCode=1;
