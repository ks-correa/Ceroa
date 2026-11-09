// Explicit one-file synthetic test in the previously approved Block 4 folder.
// Run only inside trusted n8n. Never prints tokens, document content or owner identifiers.
const fs=require('fs'),crypto=require('crypto');
const block6=process.argv[3]==='block6';if(process.argv[3]&&!block6)throw Error('Unknown test scope');
const action=process.argv[2];if(!['create','update','prepare'].includes(action))throw Error('Explicit test action required');
const root='/usr/local/lib/node_modules/n8n/node_modules/.pnpm/';
const sqlite=require(root+fs.readdirSync(root).find(x=>x.startsWith('sqlite3@'))+'/node_modules/sqlite3');
const dir='/usr/local/lib/node_modules/n8n/node_modules/n8n-core/dist/encryption/';
const {Cipher}=require(dir+'cipher'),{CipherAes256CBC}=require(dir+'aes-256-cbc'),{CipherAes256GCM}=require(dir+'aes-256-gcm');
const cipher=new Cipher(JSON.parse(fs.readFileSync('/home/node/.n8n/config')),new CipherAes256GCM(),new CipherAes256CBC(),null);
const db=new sqlite.Database('/home/node/.n8n/database.sqlite',sqlite.OPEN_READONLY);
const query=(sql,args=[])=>new Promise((resolve,reject)=>db.get(sql,args,(e,r)=>e?reject(e):resolve(r)));
const statePath='/home/node/.n8n/'+(block6?'block6':'block5')+'-drive-test.json';
function pdf(version){
 const text=(block6?'CEROABLOCK6VALIDATION':'CEROABLOCK5VALIDATION')+'. Synthetic private support reference. Revision '+version+'. The verification code is '+(block6?(version===1?'AMATISTA':'TURQUESA'):(version===1?'COBALTO':'ESMERALDA'))+'. No financial or personal information.';
 const stream='BT /F1 12 Tf 50 750 Td ('+text+') Tj ET';
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Length '+Buffer.byteLength(stream)+' >>\nstream\n'+stream+'\nendstream'];
 let body='%PDF-1.4\n',offsets=[0];objects.forEach((o,i)=>{offsets.push(Buffer.byteLength(body));body+=(i+1)+' 0 obj\n'+o+'\nendobj\n';});const offset=Buffer.byteLength(body);body+='xref\n0 6\n0000000000 65535 f \n'+offsets.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+offset+'\n%%EOF\n';return Buffer.from(body);
}
(async()=>{try{
 const row=await query("SELECT nodes,connections,settings FROM workflow_entity WHERE id='ceroaWorkspaceDrive40' AND active=0");if(!row)throw Error('Approved inactive draft required');
 const w={id:'ceroaBlock5DriveValidation50',name:'Ceroa - Bloque 5 - un archivo sintetico',active:false,nodes:JSON.parse(row.nodes),connections:JSON.parse(row.connections),settings:JSON.parse(row.settings)};
 const trigger=w.nodes.find(n=>n.id==='watch-fileCreated');const folder=trigger.parameters.folderToWatch.value;
 if(!/^[A-Za-z0-9_-]{10,100}$/.test(folder))throw Error('Literal approved folder required');
 let state=fs.existsSync(statePath)?JSON.parse(fs.readFileSync(statePath)):null;
 if(action!=='prepare'){
  if(action==='create'&&state)throw Error('Prior test state exists; never create another file automatically');
  if(action==='update'&&(!state||state.revision!==1||state.folder!==folder))throw Error('Only the known first revision may be updated');
  const cred=await query('SELECT data FROM credentials_entity WHERE id=?',[trigger.credentials.googleDriveOAuth2Api.id]);let data=cipher.decrypt(cred.data);if(typeof data==='string')data=JSON.parse(data);let token=data.oauthTokenData;if(typeof token==='string')token=JSON.parse(token);
  const refresh=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',refresh_token:token.refresh_token,client_id:data.clientId,client_secret:data.clientSecret}),signal:AbortSignal.timeout(15000)});const auth=await refresh.json();if(!refresh.ok||!auth.access_token)throw Error('OAuth unavailable');
  const headers={Authorization:'Bearer '+auth.access_token};
  const request=async(url,options={})=>{const res=await fetch(url,{...options,headers:{...headers,...options.headers},signal:AbortSignal.timeout(30000)});const value=await res.json();if(!res.ok)throw Error('Google HTTP '+res.status);return value;};
  const approved=await request('https://www.googleapis.com/drive/v3/files/'+folder+'?fields=id,name,mimeType,trashed');if(approved.name!=='Ceroa - Pruebas Bloque 4'||approved.trashed||approved.mimeType!=='application/vnd.google-apps.folder')throw Error('Previously approved test folder mismatch');
  const revision=action==='create'?1:2;const bytes=pdf(revision);const checksum=crypto.createHash('md5').update(bytes).digest('hex');
  if(action==='create'){
   state={status:'CREATE_STARTED_REVIEW_BEFORE_RETRY',folder,revision:0,name:block6?'Ceroa - Prueba integral Bloque 6.pdf':'Ceroa - Prueba integral Bloque 5.pdf'};fs.writeFileSync(statePath,JSON.stringify(state),{flag:'wx',mode:0o600});
   const boundary='ceroa-block5-'+crypto.randomBytes(12).toString('hex');const body=Buffer.concat([Buffer.from('--'+boundary+'\r\nContent-Type: application/json\r\n\r\n'+JSON.stringify({name:state.name,parents:[folder],mimeType:'application/pdf'})+'\r\n--'+boundary+'\r\nContent-Type: application/pdf\r\n\r\n'),bytes,Buffer.from('\r\n--'+boundary+'--')]);
   const created=await request('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,md5Checksum,version',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+boundary},body});state.fileId=created.id;
  }else{
   const existing=await request('https://www.googleapis.com/drive/v3/files/'+state.fileId+'?fields=id,name,parents,md5Checksum');if(existing.name!==state.name||!existing.parents?.includes(folder)||existing.md5Checksum!==state.checksum)throw Error('Test file changed outside this procedure');
   state.status='UPDATE_STARTED_REVIEW_BEFORE_RETRY';fs.writeFileSync(statePath,JSON.stringify(state),{mode:0o600});
   await request('https://www.googleapis.com/upload/drive/v3/files/'+state.fileId+'?uploadType=media&fields=id,md5Checksum,version',{method:'PATCH',headers:{'Content-Type':'application/pdf'},body:bytes});
  }
  state.revision=revision;state.checksum=checksum;state.status='FILE_WRITTEN';fs.writeFileSync(statePath,JSON.stringify(state),{mode:0o600});
 }
 if(!state?.fileId||state.folder!==folder)throw Error('Known approved test file required');
 w.nodes.find(n=>n.id==='validate').parameters.jsonBody=w.nodes.find(n=>n.id==='validate').parameters.jsonBody.replace('size:Number($json.size)}})','size:Number($json.size)} })');
 const removed=new Set(w.nodes.filter(n=>n.type.endsWith('Trigger')||n.id==='status').map(n=>n.name));w.nodes=w.nodes.filter(n=>!removed.has(n.name));for(const name of removed)delete w.connections[name];
 w.nodes.unshift({id:'manual',name:'Prueba manual autorizada',type:'n8n-nodes-base.manualTrigger',typeVersion:1,position:[-400,0],parameters:{}},{id:'file',name:'Unico archivo sintetico aprobado',type:'n8n-nodes-base.set',typeVersion:3.4,position:[-200,0],parameters:{mode:'raw',jsonOutput:JSON.stringify({id:state.fileId}),options:{}}});
 const edge=name=>({node:name,type:'main',index:0});w.connections['Prueba manual autorizada']={main:[[edge('Unico archivo sintetico aprobado')]]};w.connections['Unico archivo sintetico aprobado']={main:[[edge(w.nodes.find(n=>n.id==='metadata').name)]]};
 fs.writeFileSync('/tmp/block5-drive-workflow.json',JSON.stringify(w),{mode:0o600});console.log(JSON.stringify({status:'BOUNDED_TEST_PREPARED',revision:state.revision,automaticTriggerTested:false,generalConnectorActive:false}));
 }catch(e){console.error('Bounded Drive test stopped: '+e.message);process.exitCode=1;}finally{db.close();}})();
