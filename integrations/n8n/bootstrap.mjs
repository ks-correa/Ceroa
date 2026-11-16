import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const directory=path.dirname(fileURLToPath(import.meta.url));
export const digest=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
export const definition=w=>({id:w.id,name:w.name,nodes:w.nodes.map(n=>({...n,...(n.credentials?{credentials:Object.fromEntries(Object.entries(n.credentials).map(([t,c])=>[t,{name:c.name}]))}:{})})),connections:w.connections,settings:w.settings});
const boundDigest=w=>digest({definition:definition(w),bindings:w.nodes.map(n=>n.credentials??{})});
export function mayPublish(entry,current,saved,changed){
 if(entry.publication!=='ready'||entry.disabled)return false;
 const prior=current.find(w=>w.id===entry.id);
 if(!prior)return true;
 if(prior.active)return changed;
 // A manually unpublished workflow stays disabled; only a previously blocked
 // installation may become ready during an explicit configure/update.
 return saved?.blocked?.includes(entry.id)??false;
}
export function bind(workflow,credentials,env,existing=null){
 const missing=new Set();
 const inferred={};
 const preserve=(template,prior)=>{if(typeof template==='string'){const key=template.match(/^\$\{([A-Z_]+)\}$/)?.[1];if(key&&typeof prior==='string'&&prior&&!prior.startsWith('${')&&!prior.startsWith('=')){if(inferred[key]&&inferred[key]!==prior)throw Error('Conflicting persisted configuration: '+key);inferred[key]=prior;}}else if(template&&typeof template==='object')for(const [key,value] of Object.entries(template))preserve(value,prior?.[key]);};
 for(const node of workflow.nodes)preserve(node.parameters,existing?.nodes.find(n=>n.id===node.id)?.parameters);
 const values={...inferred,...Object.fromEntries(Object.entries(env).filter(([,v])=>v!==''&&v!==undefined))};
 const substitute=v=>Array.isArray(v)?v.map(substitute):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,substitute(x)])):typeof v==='string'?v.replace(/\$\{([A-Z_]+)\}/g,(full,key)=>{if(!values[key]){missing.add(key);return full;}return values[key];}):v;
 const result=substitute(structuredClone(workflow));
 for(const node of result.nodes)for(const [type,c] of Object.entries(node.credentials??{})){
  const matches=credentials.filter(x=>x.type===type&&x.name===c.name);
  if(matches.length>1)throw Error('Duplicate logical credential: '+type+':'+c.name);
  if(!matches.length){missing.add(type+':'+c.name);continue;}
  node.credentials[type]={id:matches[0].id,name:c.name};
 }
 return {workflow:result,missing:[...missing]};
}
export function inspect(manifest,workflows){
 const ids=new Set(workflows.map(w=>w.id));if(ids.size!==workflows.length)throw Error('Duplicate workflow ID');
 for(const entry of manifest.workflows){const w=workflows.find(w=>w.id===entry.id);if(!w)throw Error('Missing workflow '+entry.id);for(const dep of entry.dependencies)if(!ids.has(dep))throw Error('Missing dependency '+dep);
  for(const name of Object.keys(w.connections))if(!w.nodes.some(n=>n.name===name))throw Error('Broken connection '+entry.id);
  for(const channels of Object.values(w.connections))for(const outputs of Object.values(channels))for(const output of outputs)for(const edge of output??[])if(!w.nodes.some(n=>n.name===edge.node))throw Error('Broken connection target '+entry.id);
 }
}
function envCredentials(env){
 const headers=[['Ceroa assistant bridge','X-Ceroa-Assistant','ASSISTANT_WORKER_KEY'],['Ceroa Documentos','X-Ceroa-Documents','DOCUMENTS_WORKER_KEY'],['Ceroa RAG privado','X-Ceroa-RAG','RAG_WORKER_KEY'],['Ceroa biblioteca privada','X-Ceroa-Library','DOCUMENT_LIBRARY_WORKER_KEY'],['Ceroa OCR privado','X-Ceroa-OCR','DOCUMENT_LIBRARY_OCR_KEY'],['Ceroa recordatorios privados','X-Ceroa-Reminders','REMINDERS_WORKER_KEY'],['Ceroa centinela privado','X-Ceroa-Sentinel','SENTINEL_WORKER_KEY'],['Ceroa Workspace privado','X-Ceroa-Workspace','WORKSPACE_WORKER_KEY'],['Ceroa RAG Gemini Embeddings','x-goog-api-key','GEMINI_API_KEY']];
 const result=headers.filter(([, ,key])=>env[key]?.length>=32).map(([name,header,key])=>({name,type:'httpHeaderAuth',data:{name:header,value:env[key]}}));
 if(env.GEMINI_API_KEY)result.push({name:'Ceroa Gemini',type:'googlePalmApi',data:{apiKey:env.GEMINI_API_KEY,host:'https://generativelanguage.googleapis.com'}});
 if(env.N8N_SUPABASE_GATEWAY_URL&&env.N8N_SUPABASE_GATEWAY_KEY)result.push({name:'Ceroa Supabase · Gateway restringido',type:'supabaseApi',data:{host:env.N8N_SUPABASE_GATEWAY_URL,serviceRole:env.N8N_SUPABASE_GATEWAY_KEY}});
 return result.map(c=>({...c,id:'ceroa-'+digest(c.type+':'+c.name).slice(0,20)}));
}
export function initialize({env=process.env,cli}={}){
 const stateDir=env.N8N_USER_FOLDER?path.join(env.N8N_USER_FOLDER,'.n8n'):path.join(os.homedir(),'.n8n');fs.mkdirSync(stateDir,{recursive:true});
 const marker=path.join(stateDir,'ceroa-bootstrap.json'),manifest=JSON.parse(fs.readFileSync(path.join(directory,'workflows.manifest.json')));
 const source=manifest.workflows.map(entry=>{const bytes=fs.readFileSync(path.join(directory,'workflows',entry.file),'utf8');if(digest(bytes)!==entry.sha256)throw Error('Unverified definition '+entry.id);return JSON.parse(bytes);});inspect(manifest,source);
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'ceroa-init-'));
 const invoke=cli??((args)=>{const r=spawnSync('n8n',args,{encoding:'utf8',maxBuffer:32e6});if(r.status!==0&&(!/^export:/.test(args[0])||!/No (?:workflows|credentials) found/.test(r.stdout+r.stderr)))throw Error('n8n command failed: '+args[0]);});
 const exported=(what,published=false)=>{const file=path.join(temp,what+(published?'-published':'')+'.json');invoke(['export:'+what,'--all',...(published?['--published']:[]),'--output='+file]);return fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):[];};
 try{
  const current=exported('workflow');let saved=fs.existsSync(marker)?JSON.parse(fs.readFileSync(marker)):null;
  const configure=process.argv.includes('--configure'),update=process.argv.includes('--update');
  if(current.length&&!saved){
   // Adopt only the exact runtime snapshot reviewed during consolidation. No
   // workflow content or publication state is changed by this one-time step.
   const matches=current.length===manifest.workflows.length&&current.every(w=>manifest.workflows.some(e=>e.id===w.id&&e.adoptDigest===digest(definition(w))));
   if(matches){const published=exported('workflow',true);if(published.every(p=>digest(definition(p))===digest(definition(current.find(w=>w.id===p.id))))){saved={format:1,manifest:digest(manifest),blocked:[],hashes:Object.fromEntries(current.map(w=>[w.id,digest(definition(w))]))};fs.writeFileSync(marker,JSON.stringify(saved,null,2),{mode:0o600});console.log('n8n: snapshot existente verificado y registrado; ninguna definicion ni publicacion modificada.');}}
  }
  if(current.length&&!configure&&!update){console.log('n8n: volumen existente; workflows, credenciales e historial conservados.');return;}
  if(current.length&&!saved){throw Error('Existing instance does not match a verified snapshot; no workflow overwritten');}
  if(current.length){for(const w of current){if(!saved.hashes[w.id]||saved.hashes[w.id]!==digest(definition(w)))throw Error('Unexpected draft; update refused: '+w.id);}
   const published=exported('workflow',true);for(const p of published){const w=current.find(x=>x.id===p.id);if(!w||digest(definition(p))!==digest(definition(w)))throw Error('Published/draft divergence: '+p.id);}
  }
  let credentials=exported('credentials');const added=envCredentials(env).filter(c=>!credentials.some(x=>x.type===c.type&&x.name===c.name));
  if(added.length){const file=path.join(temp,'credentials-new.json');fs.writeFileSync(file,JSON.stringify(added),{mode:0o600});invoke(['import:credentials','--input='+file]);credentials=exported('credentials');}
  const bound=source.map(w=>{const b=bind(w,credentials,env,current.find(c=>c.id===w.id)),entry=manifest.workflows.find(e=>e.id===w.id);for(const required of entry.credentials)if(!credentials.some(c=>c.type===required.type&&c.name===required.name))b.missing.push(required.type+':'+required.name);for(const key of entry.requires??[])if(!env[key]||env[key]==='false')b.missing.push(key);return b;});const selected=bound.filter(b=>!current.some(w=>w.id===b.workflow.id&&boundDigest(w)===boundDigest(b.workflow)));
  // No workflow removal, no migration of unexpected drafts, no automatic consumer activation.
  if(selected.length){const file=path.join(temp,'workflows.json');fs.writeFileSync(file,JSON.stringify(selected.map(b=>b.workflow)),{mode:0o600});invoke(['import:workflow','--input='+file]);}
  const blocked=new Map(bound.filter(b=>b.missing.length).map(b=>[b.workflow.id,b.missing]));let changed=true;while(changed){changed=false;for(const e of manifest.workflows)if(!blocked.has(e.id)&&e.dependencies.some(id=>blocked.has(id))){blocked.set(e.id,['dependency']);changed=true;}}
  for(const e of manifest.workflows){if(blocked.has(e.id)){console.log('n8n pendiente '+e.id+': '+blocked.get(e.id).join(', '));continue;}
   if(mayPublish(e,current,saved,selected.some(b=>b.workflow.id===e.id)))invoke(['publish:workflow','--id='+e.id]);
  }
  const after=exported('workflow');fs.writeFileSync(marker,JSON.stringify({format:1,manifest:digest(manifest),blocked:[...blocked.keys()],hashes:Object.fromEntries(after.map(w=>[w.id,digest(definition(w))]))},null,2),{mode:0o600});
  console.log('n8n: '+after.length+' workflows verificados; consumidores externos requieren activacion manual.');
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
}
if(process.argv[1]===fileURLToPath(import.meta.url)){try{initialize();}catch(e){console.error('Inicializacion detenida: '+e.message);process.exitCode=1;}}
