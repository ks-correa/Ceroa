// Explicit synthetic-provider verification. Secrets stay in ignored local files, never stdout.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {buildMultiagent} from './multiagent-workflows.mjs';
const dir=process.argv[2];if(!dir||!path.resolve(dir).includes(path.sep+'tmp'+path.sep))throw Error('Private tmp output required');
fs.mkdirSync(dir,{recursive:true});
const published=JSON.parse(fs.readFileSync('tmp/n8n-block3/published.json','utf8')).find(w=>w.id==='ceroaHybridQuery20');
const lm=published.nodes.find(n=>n.name==='Gemini Ceroa');const credential=lm.credentials?.googlePalmApi;if(!credential?.id)throw Error('Published provider credential missing');
const inspect=JSON.parse(execFileSync('docker',['inspect','ceroa-n8n'],{encoding:'utf8'}))[0];
let key=inspect.Config.Env.find(x=>x.startsWith('N8N_ENCRYPTION_KEY='))?.slice('N8N_ENCRYPTION_KEY='.length);
if(!key)key=JSON.parse(execFileSync('docker',['exec','ceroa-n8n','cat','/home/node/.n8n/config'],{encoding:'utf8'})).encryptionKey;
if(!key||/[\r\n]/.test(key))throw Error('Cannot reuse encrypted credential safely');
fs.writeFileSync(path.join(dir,'runtime.env'),'N8N_ENCRYPTION_KEY='+key+'\nN8N_DIAGNOSTICS_ENABLED=false\nN8N_VERSION_NOTIFICATIONS_ENABLED=false\n',{mode:0o600});
execFileSync('docker',['exec','ceroa-n8n','n8n','export:credentials','--id='+credential.id,'--output=/tmp/block3-provider-encrypted.json'],{stdio:'pipe'});
execFileSync('docker',['cp','ceroa-n8n:/tmp/block3-provider-encrypted.json',path.join(dir,'provider-encrypted.json')],{stdio:'pipe'});
const encrypted=JSON.parse(fs.readFileSync(path.join(dir,'provider-encrypted.json'),'utf8'));
if(encrypted.length!==1||typeof encrypted[0].data!=='string')throw Error('Only one encrypted provider credential is permitted');
fs.writeFileSync(path.join(dir,'credentials.json'),JSON.stringify([...encrypted,{id:'fixture-worker',name:'Synthetic worker only',type:'httpHeaderAuth',data:{name:'X-Ceroa-Assistant',value:'synthetic-worker-only'}}]),{mode:0o600});
const workflows=JSON.parse(fs.readFileSync('tmp/n8n-multiagent-runtime/workflows.json','utf8'));
const children=buildMultiagent(published).slice(1);
for(const child of children){for(const n of child.nodes)if(n.type.includes('httpRequest')){n.parameters.url=n.parameters.url.replaceAll('http://backend:8080','http://127.0.0.1:18080');n.credentials={httpHeaderAuth:{id:'fixture-worker',name:'Synthetic worker only'}};}}
const cases={FINANCIAL:'Analiza el saldo registrado de mis obligaciones y aclara si la evidencia disponible permite priorizarlas.',SUPPORT:'Explícame cómo registrar un pago en Ceroa usando únicamente documentación aprobada.'};
const roots=Object.entries(cases).map(([scenario,message])=>{
 const root=structuredClone(workflows.find(w=>w.id==='ceroaMultiagentFixture30'+scenario));
 const model=root.nodes.find(n=>n.name==='Gemini Ceroa');Object.assign(model,{type:lm.type,typeVersion:lm.typeVersion,parameters:structuredClone(lm.parameters),credentials:structuredClone(lm.credentials)});
 root.nodes.find(n=>n.name==='Preparar texto').parameters.jsonOutput=JSON.stringify({requestId:'00000000-0000-4000-8000-'+(scenario==='FINANCIAL'?'000000000010':'000000000011'),message,year:2026,month:11,conversation:[]});
 return root;
});
fs.writeFileSync(path.join(dir,'workflows.json'),JSON.stringify([...children,...roots]),{mode:0o600});
console.log('Prepared two synthetic cases with the published native Gemini credential association. No secret printed.');
