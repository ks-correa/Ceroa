import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {repo,args,option,run,hash,outside,stage,cleanup,safeTar} from './transfer.mjs';
const archive=option('--archive'),key=option('--key'),project=option('--project')??'ceroa',offline=args.includes('--offline-test');
if(!archive||!key||!/^[a-z][a-z0-9_-]{1,40}$/.test(project))throw Error('Usage: node integrations/migration/restore-ceroa.mjs --archive FILE --key FILE [--project ceroa] --offline-test|--confirm-source-stopped');
if(!offline&&!args.includes('--confirm-source-stopped'))throw Error('Confirm desktop consumers are stopped before restoration');
const temp=stage(),prefix=offline?'ceroa-transfer-test-'+crypto.randomBytes(5).toString('hex'):project;const created=[];
try{
 run(process.execPath,[path.join(repo,'integrations/n8n/backup-crypto.mjs'),'decrypt',outside(archive),path.join(temp,'transfer.tar.gz'),outside(key)]);safeTar(path.join(temp,'transfer.tar.gz'));run('tar',['-xzf',path.join(temp,'transfer.tar.gz'),'-C',temp]);
 const m=JSON.parse(fs.readFileSync(path.join(temp,'manifest.json')));if(m.format!=='CEROA_TRANSFER_V2'||!/^docker\.n8n\.io\/n8nio\/n8n@sha256:[a-f0-9]{64}$/.test(m.image)||hash(path.join(temp,'config'))!==m.files.config||hash(path.join(temp,'.env'))!==m.files.env)throw Error('Invalid transfer');
 if(run('git',['rev-parse','HEAD']).trim()!==m.gitCommit)throw Error('Checkout package sourceCommit before restoring');
 if(m.ledger&&hash(path.join(temp,'bootstrap.json'))!==m.files.ledger)throw Error('Version ledger mismatch');
 if(!offline&&!m.handoff)throw Error('Export with --handoff to stop source consumers first');
 if(!offline&&fs.existsSync(path.join(repo,'.env')))throw Error('Existing .env preserved; move it privately before restore');
 for(const file of m.privateFiles??[]){if(file!=='.env.rag-admin'||hash(path.join(temp,file))!==m.files.private?.[file])throw Error('Private configuration mismatch');if(!offline&&fs.existsSync(path.join(repo,file)))throw Error('Existing private configuration preserved');}
 const volume=prefix+'_ceroa_n8n_data',provider=prefix+'_workspace-provider';
 for(const name of [volume,...(m.provider?[provider]:[])]){if(spawnInspect(name))throw Error('Destination volume exists; refusing overwrite');run('docker',['volume','create',name]);created.push(name);}
 const helper=command=>run('docker',['run','--rm','--network','none','--user','0:0','-e','N8N_USER_FOLDER=/home/node','--entrypoint','/bin/sh','-v',volume+':/home/node/.n8n','-v',temp+':/transfer','-v',path.join(repo,'integrations/n8n')+':/scripts:ro',m.image,'-c',command]);
 helper('cp /transfer/config /home/node/.n8n/config && chown -R node:node /home/node/.n8n && n8n import:entities --inputDir=/transfer/entities --truncateTables');
 if(m.ledger)helper('cp /transfer/bootstrap.json /home/node/.n8n/ceroa-bootstrap.json && chown node:node /home/node/.n8n/ceroa-bootstrap.json');
 // Never activate copied external consumers on the destination. Backend remains stopped.
 const manifest=JSON.parse(fs.readFileSync(path.join(repo,'integrations/n8n/workflows.manifest.json')));for(const e of manifest.workflows.filter(x=>x.externalEffects||x.disabled))helper('n8n unpublish:workflow --id='+e.id);
 if(m.provider){if(hash(path.join(temp,'provider.tar.gz'))!==m.files.provider)throw Error('Provider state mismatch');safeTar(path.join(temp,'provider.tar.gz'));run('docker',['run','--rm','--network','none','--user','0:0','--entrypoint','/bin/sh','-v',provider+':/data','-v',temp+':/transfer:ro',m.image,'-c','tar -xzf /transfer/provider.tar.gz -C /data']);
  const durable=JSON.parse(run('docker',['run','--rm','--network','none','--entrypoint','node','-v',provider+':/data:ro','-v',path.join(repo,'integrations/migration')+':/verification:ro',m.image,'/verification/verify-provider-snapshot.cjs']));if(!m.durable||durable.sha256!==m.durable.sha256||durable.receipts!==m.durable.receipts)throw Error('Durable journal recovery mismatch');
 }
 const raw=run('docker',['run','--rm','--network','none','--entrypoint','node','-v',volume+':/home/node/.n8n:ro','-v',path.join(repo,'integrations/migration')+':/verification:ro',m.image,'/verification/verify-n8n-snapshot.cjs']);const verification=JSON.parse(raw);if(verification.status!=='VERIFIED_OFFLINE')throw Error('Credential recovery failed');
 if(!offline){
  if(fs.existsSync(path.join(repo,'.env')))throw Error('Existing .env preserved; move it privately before restore');
  let env=fs.readFileSync(path.join(temp,'.env'),'utf8');const safe={COMPOSE_PROJECT_NAME:project,REMINDERS_ENABLED:'false',WORKSPACE_GMAIL_ENABLED:'false',WORKSPACE_SHEETS_ENABLED:'false',WORKSPACE_CALENDAR_ENABLED:'false',CEROA_RECOVERY_DELIVERY_ENABLED:'false'};
  for(const [key,value] of Object.entries(safe)){const pattern=new RegExp('^'+key+'=.*$','m');env=pattern.test(env)?env.replace(pattern,key+'='+value):env+'\n'+key+'='+value;}
  fs.writeFileSync(path.join(repo,'.env'),env+'\n',{flag:'wx',mode:0o600});
  for(const file of m.privateFiles??[])fs.copyFileSync(path.join(temp,file),path.join(repo,file),fs.constants.COPYFILE_EXCL);
 }
 console.log(JSON.stringify({status:'RESTORED_AND_VERIFIED',offline,credentials:verification.credentials.length,counts:verification.counts,providerStateRestored:m.provider,servicesStarted:false,sourceCommit:m.gitCommit}));
}finally{if(offline)for(const name of created)run('docker',['volume','rm',name]);cleanup(temp);}
function spawnInspect(name){try{run('docker',['volume','inspect',name]);return true;}catch{return false;}}
