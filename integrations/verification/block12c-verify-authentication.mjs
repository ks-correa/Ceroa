import fs from 'node:fs';import crypto from 'node:crypto';import {spawnSync} from 'node:child_process';
const b='/private/block12c',archive='/backups/block12c-financial-storage.ceroa';
if(fs.readFileSync('/sys/fs/cgroup/memory.swap.max','utf8').trim()!=='0')throw Error('swap');
const tampered=Buffer.from(fs.readFileSync(archive));tampered[tampered.length-1]^=1;fs.writeFileSync(b+'/tampered.ceroa',tampered,{flag:'wx',mode:0o600});fs.writeFileSync(b+'/wrong-test.key',crypto.randomBytes(32).toString('base64url'),{flag:'wx',mode:0o600});
const attempt=(input,key,output)=>{const r=spawnSync(process.execPath,[b+'/backup-crypto.mjs','decrypt',input,output,key],{stdio:'ignore'});if(r.status===0||fs.existsSync(output))throw Error('Invalid archive accepted');};
attempt(b+'/tampered.ceroa','/keys/block12c-financial.key',b+'/tampered-clear.tar');attempt(archive,b+'/wrong-test.key',b+'/wrong-key-clear.tar');
for(const f of ['tampered.ceroa','wrong-test.key'])fs.unlinkSync(b+'/'+f);
const result={cipher:'AES-256-GCM',authenticatedRoundTripVerified:true,realArchiveTamperingRejected:true,realArchiveWrongKeyRejected:true,noPlaintextOutputOnFailure:true,ciphertextSha256:crypto.createHash('sha256').update(fs.readFileSync(archive)).digest('hex'),ciphertextBytes:fs.statSync(archive).size};fs.writeFileSync(b+'/crypto-results.json',JSON.stringify(result));console.log(JSON.stringify(result));
