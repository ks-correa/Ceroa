import fs from 'node:fs';import path from 'node:path';import {repo,args,option,run,hash,outside,stage,cleanup} from './transfer.mjs';
const output=option('--output'),keyPath=option('--key'),project=option('--project')??'ceroa';
if(!output||!keyPath)throw Error('Usage: node integrations/migration/export-ceroa.mjs --output PRIVATE_DIR --key SEPARATE_KEY_FILE [--project ceroa] [--handoff]');
const destination=outside(output),key=outside(keyPath),relativeKey=path.relative(destination,key);if(!relativeKey.startsWith('..')&&!path.isAbsolute(relativeKey))throw Error('Keep key separate from package');fs.mkdirSync(destination,{recursive:true});fs.mkdirSync(path.dirname(key),{recursive:true});
const temp=stage(),stopped=[];const handoff=args.includes('--handoff');let completed=false;
try{
 const ids=run('docker',['ps','-aq','--filter','label=com.docker.compose.project='+project]).trim().split(/\r?\n/).filter(Boolean);const containers=ids.length?JSON.parse(run('docker',['inspect',...ids])):[];
 // Compatibility with the prior manually started backend; new installs use Compose labels.
 if(project==='ceroa'){try{const c=JSON.parse(run('docker',['container','inspect','ceroa-backend']))[0];if(!containers.some(x=>x.Id===c.Id)){c.Config.Labels={...c.Config.Labels,'com.docker.compose.service':'backend'};containers.push(c);}}catch{}}
 const n8n=containers.find(c=>c.Config.Labels['com.docker.compose.service']==='n8n');if(!n8n)throw Error('n8n project not found');
 const image=JSON.parse(run('docker',['image','inspect',n8n.Image]))[0].RepoDigests.find(x=>x.startsWith('docker.n8n.io/n8nio/n8n@sha256:'));if(!image)throw Error('Pinned image required');
 const n8nVolume=n8n.Mounts.find(m=>m.Destination==='/home/node/.n8n'&&m.Type==='volume')?.Name;if(!n8nVolume)throw Error('Persistent n8n volume required');
 // A routine backup pauses writers but keeps the public tunnel URL stable.
 // A final handoff also stops the external transports on the source machine.
 const pausedServices=['backend','n8n','workspace-provider',...(handoff?['telegram-proxy','telegram-tunnel']:[])];
 for(const c of containers.filter(c=>c.State?.Running&&pausedServices.includes(c.Config.Labels['com.docker.compose.service']))){run('docker',['stop',c.Id]);stopped.push(c.Id);}
 fs.copyFileSync(path.join(repo,'.env'),path.join(temp,'.env'));
 const privateFiles=['.env.rag-admin'].filter(file=>fs.existsSync(path.join(repo,file)));for(const file of privateFiles)fs.copyFileSync(path.join(repo,file),path.join(temp,file));
 // Official entity export excludes execution history by default; preserve the encryption key verbatim.
 run('docker',['run','--rm','--network','none','--user','0:0','-e','N8N_USER_FOLDER=/home/node','--entrypoint','/bin/sh','-v',n8nVolume+':/home/node/.n8n','-v',temp+':/transfer',image,'-c','cp /home/node/.n8n/config /transfer/config && if [ -f /home/node/.n8n/ceroa-bootstrap.json ]; then cp /home/node/.n8n/ceroa-bootstrap.json /transfer/bootstrap.json; fi && n8n export:entities --outputDir=/transfer/entities']);
 const provider=containers.find(c=>c.Config.Labels['com.docker.compose.service']==='workspace-provider');const providerVolume=provider?.Mounts.find(m=>m.Destination==='/data'&&m.Type==='volume')?.Name;
 if(providerVolume)run('docker',['run','--rm','--network','none','--user','0:0','--entrypoint','/bin/sh','-v',providerVolume+':/data:ro','-v',temp+':/transfer',image,'-c','tar -czf /transfer/provider.tar.gz -C /data .']);
 const durable=providerVolume?JSON.parse(run('docker',['run','--rm','--network','none','--entrypoint','node','-v',providerVolume+':/data:ro','-v',path.join(repo,'integrations/migration')+':/verification:ro',image,'/verification/verify-provider-snapshot.cjs'])):null;
 const ledger=fs.existsSync(path.join(temp,'bootstrap.json'));
 const manifest={format:'CEROA_TRANSFER_V2',gitCommit:run('git',['rev-parse','HEAD']).trim(),createdAt:new Date().toISOString(),image,handoff,provider:!!providerVolume,durable,privateFiles,ledger,sourceHost:process.env.COMPUTERNAME??'local',database:'existing Supabase; no financial data exported',files:{config:hash(path.join(temp,'config')),env:hash(path.join(temp,'.env')),private:Object.fromEntries(privateFiles.map(file=>[file,hash(path.join(temp,file))])),...(ledger?{ledger:hash(path.join(temp,'bootstrap.json'))}:{}),...(providerVolume?{provider:hash(path.join(temp,'provider.tar.gz'))}:{})}};
 fs.writeFileSync(path.join(temp,'manifest.json'),JSON.stringify(manifest));
 run('tar',['-czf',path.join(temp,'transfer.tar.gz'),'-C',temp,'.env',...privateFiles,'config','entities','manifest.json',...(ledger?['bootstrap.json']:[]),...(providerVolume?['provider.tar.gz']:[])]);
 const archive=path.join(destination,'ceroa-'+Date.now()+'.ceroa');run(process.execPath,[path.join(repo,'integrations/n8n/backup-crypto.mjs'),'encrypt',path.join(temp,'transfer.tar.gz'),archive,key]);completed=true;
 console.log(JSON.stringify({archive,keyFile:key,sha256:hash(archive),handoff,servicesStopped:handoff,providerStateIncluded:!!providerVolume}));
}finally{if(!handoff||!completed)for(const id of stopped.reverse())run('docker',['start',id]);cleanup(temp);}
