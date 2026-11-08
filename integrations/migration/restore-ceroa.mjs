import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import crypto from 'node:crypto';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const args=process.argv.slice(2),option=name=>{const i=args.indexOf(name);return i>=0?args[i+1]:undefined;};
const archive=option('--archive'),key=option('--key'),destination=option('--destination'),project=option('--project')??'ceroa';
if(!archive||!key||!destination||!project.match(/^[a-z][a-z0-9_-]{1,40}$/))throw Error('Required: --archive FILE --key FILE --destination EMPTY_DIRECTORY [--project ceroa] [--offline-test]');
const here=path.dirname(fileURLToPath(import.meta.url)),target=path.resolve(destination),stage=fs.mkdtempSync(path.join(os.tmpdir(),'ceroa-restore-'));
const offline=args.includes('--offline-test'),volume=offline?'ceroa-restore-test-'+crypto.randomBytes(6).toString('hex'):project+'_ceroa_n8n_data';let created=false;
const run=(cmd,argv,extra={})=>{const r=spawnSync(cmd,argv,{encoding:'utf8',maxBuffer:16*1024*1024,...extra});if(r.status!==0)throw Error('Command failed: '+cmd+' '+argv[0]);return r.stdout;};
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function safeArchive(file,gzip){const entries=run('tar',[gzip?'-tzf':'-tf',file]).split(/\r?\n/).filter(Boolean);for(const entry of entries){const normalized=entry.replaceAll('\\','/');if(normalized.startsWith('/')||/^[A-Za-z]:/.test(normalized)||normalized.split('/').includes('..'))throw Error('Unsafe archive path');}}
try{
 if(fs.existsSync(target)&&fs.readdirSync(target).length)throw Error('Destination must be empty; no existing project overwritten');fs.mkdirSync(target,{recursive:true});
 const metadata=JSON.parse(fs.readFileSync(path.join(path.dirname(path.resolve(archive)),'manifest.json'),'utf8'));if(metadata.format!=='CEROA_MIGRATION_V1'||hash(archive)!==metadata.archiveSha256||!/^docker\.n8n\.io\/n8nio\/n8n@sha256:[a-f0-9]{64}$/.test(metadata.n8nImage))throw Error('Invalid migration manifest');
 const cryptoScript=fs.existsSync(path.join(here,'backup-crypto.mjs'))?path.join(here,'backup-crypto.mjs'):path.resolve(here,'../n8n/backup-crypto.mjs');
 run(process.execPath,[cryptoScript,'decrypt',path.resolve(archive),path.join(stage,'bundle.tar.gz'),path.resolve(key)]);safeArchive(path.join(stage,'bundle.tar.gz'),true);run('tar',['-xzf',path.join(stage,'bundle.tar.gz'),'-C',stage]);
 const inner=JSON.parse(fs.readFileSync(path.join(stage,'manifest.json'),'utf8'));for(const field of ['id','gitCommit','n8nImage','sourceArchiveSha256','n8nVolumeSha256'])if(inner[field]!==metadata[field])throw Error('Manifest mismatch');if(hash(path.join(stage,'project.tar'))!==inner.sourceArchiveSha256||hash(path.join(stage,'n8n-volume.tar.gz'))!==inner.n8nVolumeSha256)throw Error('Archive checksum mismatch');
 safeArchive(path.join(stage,'project.tar'),false);run('tar',['-xf',path.join(stage,'project.tar'),'-C',target]);
 for(const file of inner.privateFiles){if(!/^\.env(?:\.[a-z0-9-]+)?$/.test(file))throw Error('Unexpected private config path');fs.copyFileSync(path.join(stage,'private',file),path.join(target,file));}
 for(const file of fs.readdirSync(path.join(stage,'private/backup-keys'))){if(path.basename(file)!==file||!file.endsWith('.key'))throw Error('Unexpected backup key path');fs.mkdirSync(path.join(target,'backups/n8n'),{recursive:true});fs.copyFileSync(path.join(stage,'private/backup-keys',file),path.join(target,'backups/n8n',file));}
 const existing=spawnSync('docker',['volume','inspect',volume],{encoding:'utf8'});if(existing.status===0)throw Error('Target Docker volume already exists; refusing overwrite');
 run('docker',['volume','create',volume]);created=true;run('docker',['run','--rm','--network','none','--user','0:0','--entrypoint','/bin/sh','-v',volume+':/data','-v',stage+':/backup:ro',inner.n8nImage,'-c','tar -xzf /backup/n8n-volume.tar.gz -C /data']);
 const check=run('docker',['run','--rm','--network','none','--entrypoint','node','-v',volume+':/home/node/.n8n:ro','-v',path.join(target,'integrations/migration')+':/verification:ro',inner.n8nImage,'/verification/verify-n8n-snapshot.cjs']);const verification=JSON.parse(check);if(verification.status!=='VERIFIED_OFFLINE')throw Error('Restored credential decryption failed');
 fs.writeFileSync(path.join(target,'RESTORE-VERIFICATION.json'),JSON.stringify({restoredAt:new Date().toISOString(),sourceCommit:inner.gitCommit,volume,offlineTest:offline,...verification},null,2));
 console.log(JSON.stringify({status:'RESTORED_AND_DECRYPTION_VERIFIED',destination:target,volume,offlineTest:offline,credentials:verification.credentials.length,counts:verification.counts,servicesStarted:false}));
}finally{
 if(offline&&created)run('docker',['volume','rm',volume]);
 const resolved=path.resolve(stage);if(path.dirname(resolved)!==path.resolve(os.tmpdir())||!path.basename(resolved).startsWith('ceroa-restore-'))throw Error('Unsafe temporary cleanup target');fs.rmSync(resolved,{recursive:true,force:true});
}
