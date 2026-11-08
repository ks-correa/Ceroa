import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import crypto from 'node:crypto';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),workspace=path.resolve(here,'../..');
const run=(cmd,args,options={})=>{const r=spawnSync(cmd,args,{cwd:workspace,encoding:'utf8',maxBuffer:8*1024*1024,...options});if(r.status!==0)throw Error('Command failed: '+cmd+' '+args[0]);return r.stdout;};
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const id='ceroa-'+new Date().toISOString().slice(0,10)+'-'+crypto.randomBytes(4).toString('hex');
const output=path.join(workspace,'backups/migration',id),keyDir=path.join(workspace,'backups/migration-keys');
const stage=fs.mkdtempSync(path.join(os.tmpdir(),'ceroa-export-'));let stopped=false;
try{
 if(run('git',['status','--porcelain']).trim())throw Error('Commit source changes before exporting');
 const container=JSON.parse(run('docker',['inspect','ceroa-n8n']))[0];if(!container.State.Running)throw Error('Expected running n8n');
 const volume=container.Mounts.find(m=>m.Type==='volume'&&m.Destination==='/home/node/.n8n')?.Name;if(!volume)throw Error('Persistent n8n volume missing');
 const image=JSON.parse(run('docker',['image','inspect',container.Image]))[0].RepoDigests.find(d=>d.startsWith('docker.n8n.io/n8nio/n8n@sha256:'));if(!image)throw Error('Pullable pinned n8n image required');
 fs.mkdirSync(output,{recursive:true});fs.mkdirSync(keyDir,{recursive:true});fs.mkdirSync(path.join(stage,'private'),{recursive:true});
 const privateFiles=['.env','.env.telegram-local','.env.n8n-sandbox','.env.rag-admin'].filter(f=>fs.existsSync(path.join(workspace,f)));
 for(const file of privateFiles)fs.copyFileSync(path.join(workspace,file),path.join(stage,'private',file));
 const oldKeys=path.join(workspace,'backups/n8n');fs.mkdirSync(path.join(stage,'private/backup-keys'),{recursive:true});for(const file of fs.readdirSync(oldKeys).filter(f=>f.endsWith('.key')))fs.copyFileSync(path.join(oldKeys,file),path.join(stage,'private/backup-keys',file));
 run('git',['archive','--format=tar','--output='+path.join(stage,'project.tar'),'HEAD']);
 run('docker',['stop','ceroa-n8n']);stopped=true;
 try{run('docker',['run','--rm','--network','none','--user','0:0','--entrypoint','/bin/sh','-v',volume+':/data:ro','-v',stage+':/backup',image,'-c','tar -czf /backup/n8n-volume.tar.gz -C /data .']);}finally{run('docker',['start','ceroa-n8n']);stopped=false;}
 const manifest={format:'CEROA_MIGRATION_V1',id,createdAt:new Date().toISOString(),gitCommit:run('git',['rev-parse','HEAD']).trim(),n8nImage:image,sourceArchiveSha256:hash(path.join(stage,'project.tar')),n8nVolumeSha256:hash(path.join(stage,'n8n-volume.tar.gz')),privateFiles,externalDatabase:'Existing remote database and storage; credentials preserved, no database dump',calendarConsent:'Pending unless granted after this snapshot',startAutomatically:false};
 fs.writeFileSync(path.join(stage,'manifest.json'),JSON.stringify(manifest,null,2));
 run('tar',['-czf',path.join(stage,'bundle.tar.gz'),'-C',stage,'project.tar','n8n-volume.tar.gz','private','manifest.json']);
 const archive=path.join(output,id+'.ceroa'),key=path.join(keyDir,id+'.key');
 run(process.execPath,[path.join(workspace,'integrations/n8n/backup-crypto.mjs'),'encrypt',path.join(stage,'bundle.tar.gz'),archive,key]);
 const publicManifest={...manifest,archiveFile:path.basename(archive),archiveSha256:hash(archive)};fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(publicManifest,null,2));
 for(const file of ['restore-ceroa.mjs','verify-n8n-snapshot.cjs'])fs.copyFileSync(path.join(here,file),path.join(output,file));fs.copyFileSync(path.join(workspace,'integrations/n8n/backup-crypto.mjs'),path.join(output,'backup-crypto.mjs'));fs.copyFileSync(path.join(here,'README.md'),path.join(output,'LEEME.md'));
 console.log(JSON.stringify({status:'ENCRYPTED_EXPORT_READY',directory:output,archive,keyFile:key,sourceCommit:manifest.gitCommit,n8nRestarted:true}));
}finally{
 if(stopped)run('docker',['start','ceroa-n8n']);
 const resolved=path.resolve(stage);if(path.dirname(resolved)!==path.resolve(os.tmpdir())||!path.basename(resolved).startsWith('ceroa-export-'))throw Error('Unsafe temporary cleanup target');fs.rmSync(resolved,{recursive:true,force:true});
}
