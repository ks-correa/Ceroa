import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {shareDocumentProcessor} from './document-processor.mjs';
const [publishedPath,outputDir]=process.argv.slice(2);
if(!outputDir)throw Error('Usage: node prepare-document-refactor.mjs PUBLISHED_EXPORT PRIVATE_OUTPUT_DIR');
const published=JSON.parse(await readFile(publishedPath,'utf8'));
const ingestion=published.find(w=>w.id==='ceroaRagIngest20'),sync=published.find(w=>w.id==='ceroaRagSync20');
if(!ingestion||!sync)throw Error('Both published workers are required');
const {worker,adapters}=shareDocumentProcessor(ingestion,sync);
await mkdir(outputDir,{recursive:true});
for(const w of [worker,...adapters]){
  // No stale version, ownership, or publication metadata on import.
  const portable={id:w.id,name:w.name,active:false,nodes:w.nodes,connections:w.connections,settings:w.settings};
  await writeFile(`${outputDir}/${w.id}.json`,JSON.stringify(portable,null,2)+'\n',{flag:'wx',mode:0o600});
}
console.log('Prepared worker and two inactive adapters from published definitions; credentials reused, no imports or publications performed.');
