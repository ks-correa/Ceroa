// Trusted n8n container only. Worker secret arrives on stdin; never print credential data.
const fs=require('node:fs');const root='/usr/local/lib/node_modules/n8n/node_modules/.pnpm/';
const sqlite=require(root+fs.readdirSync(root).find(x=>x.startsWith('sqlite3@'))+'/node_modules/sqlite3');
const dir='/usr/local/lib/node_modules/n8n/node_modules/n8n-core/dist/encryption/';const {Cipher}=require(dir+'cipher'),{CipherAes256CBC}=require(dir+'aes-256-cbc'),{CipherAes256GCM}=require(dir+'aes-256-gcm');
const cipher=new Cipher(JSON.parse(fs.readFileSync('/home/node/.n8n/config','utf8')),new CipherAes256GCM(),new CipherAes256CBC(),null);
const decode=value=>{const data=cipher.decrypt(value);return typeof data==='string'?JSON.parse(data):data;};
const encrypt=value=>typeof cipher.encryptWithInstanceKey==='function'?cipher.encryptWithInstanceKey(value):cipher.encrypt(value);
let key='';process.stdin.on('data',b=>key+=b);process.stdin.on('end',()=>{
 const db=new sqlite.Database('/home/node/.n8n/database.sqlite',sqlite.OPEN_READONLY);
 db.all('SELECT id,name,type,data FROM credentials_entity',(error,rows)=>{try{
  key=key.trim();if(error||!key.match(/^[a-f0-9]{64}$/))throw Error();const added=[];
  const worker=rows.find(r=>r.id==='ceroaWorkspaceWorker40');if(worker){const data=decode(worker.data);if(data.name!=='X-Ceroa-Workspace'||data.value!==key)throw Error();}
  else added.push({id:'ceroaWorkspaceWorker40',name:'Ceroa Workspace privado',type:'httpHeaderAuth',data:encrypt({name:'X-Ceroa-Workspace',value:key})});
  let calendar=rows.find(r=>r.type==='googleCalendarOAuth2Api');if(!calendar){const source=rows.find(r=>r.type==='googleDriveOAuth2Api');if(!source)throw Error();const data=decode(source.data);if(!data.clientId||!data.clientSecret)throw Error();calendar={id:'ceroaGoogleCalendar40',name:'Ceroa Calendar - pendiente de autorizacion',type:'googleCalendarOAuth2Api',data:encrypt({clientId:data.clientId,clientSecret:data.clientSecret})};added.push(calendar);}
  fs.writeFileSync('/tmp/ceroa-google-runtime-credentials.json',JSON.stringify(added),{mode:0o600});console.log(JSON.stringify({newCredentials:added.map(c=>({id:c.id,name:c.name,type:c.type})),calendar:{id:calendar.id,name:calendar.name},worker:{id:'ceroaWorkspaceWorker40',name:worker?.name??'Ceroa Workspace privado'}}));
 }catch{console.error('Credential preparation rejected; no secret output');process.exitCode=1;}finally{db.close();}});
});
