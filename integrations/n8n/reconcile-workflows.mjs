import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const [draftPath,publishedPath,outputPath]=process.argv.slice(2);
if(!outputPath)throw Error('Usage: node reconcile-workflows.mjs DRAFTS PUBLISHED REPORT');
const drafts=JSON.parse(await readFile(draftPath,'utf8')),published=JSON.parse(await readFile(publishedPath,'utf8'));
// Compare executable definitions without credentials, UI coordinates or export metadata.
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
const definition=w=>({nodes:w.nodes.map(({credentials,position,...n})=>n).sort((a,b)=>a.id.localeCompare(b.id)),connections:w.connections,settings:w.settings});
const hash=w=>createHash('sha256').update(JSON.stringify(canonical(definition(w)))).digest('hex');
const templates=new Map();
for(const file of await readdir(new URL('.',import.meta.url))){if(!file.endsWith('.json'))continue;const w=JSON.parse(await readFile(new URL(file,import.meta.url),'utf8'));if(w.id&&w.nodes)templates.set(w.id,{file,w});}
const rows=drafts.map(w=>{const p=published.find(v=>v.id===w.id),t=templates.get(w.id);return {id:w.id,active:w.active,archived:w.isArchived??false,draftVersion:w.versionId,publishedVersion:p?.versionId??null,template:t?.file??null,draftHash:hash(w),publishedHash:p?hash(p):null,templateHash:t?hash(t.w):null,draftMatchesPublished:p?hash(w)===hash(p):null,templateMatchesPublished:p&&t?hash(t.w)===hash(p):null};});
await writeFile(outputPath,JSON.stringify({capturedAt:new Date().toISOString(),draftCount:drafts.length,publishedCount:published.length,workflows:rows},null,2)+'\n',{flag:'wx'});
console.log(`Reconciled ${drafts.length} drafts and ${published.length} published workflows; ${rows.filter(r=>r.templateMatchesPublished===false).length} published/template differences. No workflow changed.`);
