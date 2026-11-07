import {readFile,writeFile} from 'node:fs/promises';
import {extendDocumentQuery} from './extend-document-query.mjs';
const [input,output]=process.argv.slice(2);if(!output)throw Error('Usage: node prepare-query-refactor.mjs PUBLISHED_EXPORT PRIVATE_OUTPUT');
const original=JSON.parse(await readFile(input,'utf8')).find(w=>w.id==='ceroaHybridQuery20');
if(!original)throw Error('Published assistant missing');
const w=extendDocumentQuery(original);
await writeFile(output,JSON.stringify({id:w.id,name:w.name,active:false,nodes:w.nodes,connections:w.connections,settings:w.settings},null,2)+'\n',{flag:'wx',mode:0o600});
console.log('Prepared inactive query from its published definition, preserving credentials.');
