import {readFile,writeFile} from 'node:fs/promises';
const [beforePath,afterPath,reportPath]=process.argv.slice(2);if(!reportPath)throw Error('BEFORE AFTER REPORT required');
const before=JSON.parse(await readFile(beforePath,'utf8')),after=JSON.parse(await readFile(afterPath,'utf8'));
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
if(before.length!==after.length)throw Error('Published workflow count changed unexpectedly');
const unchanged=[];
for(const old of before){
 const fresh=after.find(w=>w.id===old.id);if(!fresh)throw Error('Published workflow missing: '+old.id);
 if(old.id==='ceroaHybridQuery20')continue;
 for(const key of ['nodes','connections','settings'])if(!same(old[key],fresh[key]))throw Error('Unrelated published definition changed: '+old.id);
 unchanged.push(old.id);
}
const old=before.find(w=>w.id==='ceroaHybridQuery20'),fresh=after.find(w=>w.id===old.id);
for(const n of old.nodes.filter(n=>!['Analizar finanzas','Consultar documentos financieros'].includes(n.name)))if(!same(n,fresh.nodes.find(v=>v.id===n.id)))throw Error('Unrelated query node changed: '+n.id);
if(fresh.nodes.length!==old.nodes.length+3)throw Error('Unexpected query node count');
const observation=fresh.nodes.find(n=>n.id==='agent-observation');
if(!same(observation.credentials,old.nodes.find(n=>n.name==='Preparar contexto en Spring Boot').credentials))throw Error('Assistant credential association changed');
await writeFile(reportPath,JSON.stringify({capturedAt:new Date().toISOString(),publishedWorkflows:after.length,modifiedWorkflow:'ceroaHybridQuery20',unaffectedPublishedWorkflows:unchanged,originalQueryNodes:old.nodes.length,currentQueryNodes:fresh.nodes.length,unrelatedQueryNodesPreserved:true,credentialAssociationsPreserved:true},null,2)+'\n',{flag:'wx'});
console.log('Verified '+unchanged.length+' unchanged published workflows and preserved unrelated query nodes/credentials.');
