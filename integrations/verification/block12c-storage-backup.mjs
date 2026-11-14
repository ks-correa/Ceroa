import fs from 'node:fs';
import crypto from 'node:crypto';
if(fs.readFileSync('/sys/fs/cgroup/memory.swap.max','utf8').trim()!=='0')throw Error('Swap not blocked');
if(!fs.existsSync('/private/synthetic-probe.txt'))throw Error('Encrypted mount marker missing');
const base='/private/block12c',access=JSON.parse(fs.readFileSync(base+'/storage-access.json','utf8')),inventory=JSON.parse(fs.readFileSync(base+'/source-inventory.json','utf8'));
const origin=new URL(access.url);if(origin.protocol!=='https:'||origin.username||origin.password)throw Error('Invalid source');
const refs=new Map([...inventory.documents,...inventory.versions].map(x=>[x.path,x.hash]));
fs.mkdirSync(base+'/storage-files',{mode:0o700});const manifest=[];let bytes=0;
for(const o of inventory.storageObjects){
 const path=[o.bucket_id,...o.name.split('/')].map(encodeURIComponent).join('/');
 const res=await fetch(new URL('/storage/v1/object/authenticated/'+path,origin),{headers:{apikey:access.key,Authorization:'Bearer '+access.key},redirect:'error',signal:AbortSignal.timeout(60000)});
 if(!res.ok)throw Error('Object download failed');
 const body=Buffer.from(await res.arrayBuffer());const hash=crypto.createHash('sha256').update(body).digest('hex');
 if(o.metadata?.size!=null&&Number(o.metadata.size)!==body.length)throw Error('Object size mismatch');
 if(refs.has(o.name)&&refs.get(o.name)!==hash)throw Error('Document content hash mismatch');
 const file=crypto.createHash('sha256').update(o.bucket_id+'\0'+o.name).digest('hex')+'.bin';fs.writeFileSync(base+'/storage-files/'+file,body,{flag:'wx',mode:0o600});
 manifest.push({bucket:o.bucket_id,path:o.name,id:o.id,version:o.version,updatedAt:o.updated_at,file,bytes:body.length,sha256:hash,documentHashMatched:refs.has(o.name),etag:res.headers.get('etag')});bytes+=body.length;
}
fs.writeFileSync(base+'/storage-manifest.json',JSON.stringify({downloadedAt:new Date().toISOString(),objects:manifest},null,2),{flag:'wx',mode:0o600});
console.log(JSON.stringify({storageDownloaded:manifest.length,bytes,documentHashesMatched:manifest.filter(x=>x.documentHashMatched).length,contentsPublished:false}));
