import fs from 'node:fs';import crypto from 'node:crypto';
const b='/private/block12c';const read=n=>JSON.parse(fs.readFileSync(b+'/'+n,'utf8'));
const lines=n=>fs.readFileSync(b+'/'+n,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
const a=lines('snapshot-fingerprints.jsonl'),r=lines('snapshot-restored-fingerprints.jsonl');
const matched=JSON.stringify(a)===JSON.stringify(r);
const inv=read('snapshot-inventory.json'),after=read('source-inventory-after.json'),storage=read('storage-manifest.json');
const stable=x=>JSON.stringify(x.storageObjects.map(o=>({id:o.id,bucket:o.bucket_id,name:o.name,version:o.version,updated:o.updated_at,metadata:o.metadata})).sort((a,b)=>a.id.localeCompare(b.id)));
const metadataStable=stable(inv)===stable(after);
const refs=[...inv.documents,...inv.versions];const binaries=storage.objects;
const allHashes=binaries.every(x=>crypto.createHash('sha256').update(fs.readFileSync(b+'/storage-files/'+x.file)).digest('hex')===x.sha256);
const refsMatch=refs.every(x=>binaries.some(o=>o.path===x.path&&o.sha256===x.hash));
const result={checkedAt:new Date().toISOString(),applicationTables:a.length,allTableCountsAndSha256Match:matched,storageObjects:binaries.length,storageBytes:binaries.reduce((s,o)=>s+o.bytes,0),storageBinaryHashesVerified:allHashes,documentReferences:refs.length,documentHashesMatched:refsMatch,storageMetadataStableBetweenInventories:metadataStable,sharedDatabaseStorageTransactionSnapshot:false,sourceFingerprintAndDumpShareSnapshot:true};
fs.writeFileSync(b+'/verification-summary.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));if(!matched||!metadataStable||!allHashes||!refsMatch)process.exitCode=1;

