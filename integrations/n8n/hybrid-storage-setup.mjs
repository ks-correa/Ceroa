import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const env=Object.fromEntries((await readFile('.env','utf8')).split(/\r?\n/).filter(l=>/^[A-Z_]+=/.test(l)).map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1).trim().replace(/^(['"])(.*)\1$/,'$2')]));
const origin=new URL(env.DOCUMENT_LIBRARY_STORAGE_URL);
assert.equal(origin.protocol,'https:');assert.match(origin.hostname,/^[a-z0-9]+\.supabase\.co$/);
const ref=env.DB_USERNAME.split('.').at(-1);assert.equal(origin.hostname,`${ref}.supabase.co`,'Storage must belong to the financial database project');
const key=env.DOCUMENT_LIBRARY_STORAGE_KEY;assert.ok(key&&key.length>30,'Storage key not configured');
if(key.startsWith('eyJ')){const claims=JSON.parse(Buffer.from(key.split('.')[1],'base64url'));assert.equal(claims.role,'service_role');if(claims.ref)assert.equal(claims.ref,ref);}
const bucket=env.DOCUMENT_LIBRARY_BUCKET||'financial-documents';assert.match(bucket,/^[a-z0-9-]+$/);
const headers={apikey:key,Authorization:`Bearer ${key}`,'content-type':'application/json'};
async function call(path,method='GET',body){const res=await fetch(`${origin.origin}/storage/v1/${path}`,{method,headers,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});return {status:res.status,body:await res.json()};}
let result=await call(`bucket/${bucket}`);
if(result.status!==200){
 assert.ok([400,404].includes(result.status)&&['404','NoSuchBucket'].includes(String(result.body.statusCode??result.body.code)),`Storage preflight failed: HTTP ${result.status}, code ${result.body.code??result.body.error??'unknown'}`);
 const created=await call('bucket','POST',{id:bucket,name:bucket,public:false,file_size_limit:8388608,allowed_mime_types:['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']});
 assert.ok([200,201].includes(created.status),`Bucket creation failed: HTTP ${created.status}`);result=await call(`bucket/${bucket}`);
}
assert.equal(result.status,200);assert.equal(result.body.public,false);assert.equal(Number(result.body.file_size_limit),8388608);
assert.equal(result.body.allowed_mime_types.length,3);
console.log(JSON.stringify({projectMatchesDatabase:true,storageCredential:'VERIFIED',bucket,private:true,maxBytes:result.body.file_size_limit,allowedTypes:result.body.allowed_mime_types.length}));
