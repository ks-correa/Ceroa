// Read existing encrypted n8n credentials in memory; never export or rewrite them.
const fs=require('node:fs');
module.exports=async function load(){
 const root='/usr/local/lib/node_modules/n8n/node_modules/.pnpm/';
 const sqlite=require(root+fs.readdirSync(root).find(x=>x.startsWith('sqlite3@'))+'/node_modules/sqlite3');
 const dir='/usr/local/lib/node_modules/n8n/node_modules/n8n-core/dist/encryption/';
 const {Cipher}=require(dir+'cipher'),{CipherAes256CBC}=require(dir+'aes-256-cbc'),{CipherAes256GCM}=require(dir+'aes-256-gcm');
 const cipher=new Cipher(JSON.parse(fs.readFileSync('/home/node/.n8n/config','utf8')),new CipherAes256GCM(),new CipherAes256CBC(),null);
 const db=new sqlite.Database('/home/node/.n8n/database.sqlite',sqlite.OPEN_READONLY);
 const rows=await new Promise((resolve,reject)=>db.all('SELECT id,name,type,data FROM credentials_entity',(e,r)=>e?reject(e):resolve(r)));
 db.close();
 const one=(type,name)=>{const matches=rows.filter(r=>r.type===type&&(!name||r.name===name));if(matches.length!==1)throw Error('Unambiguous configured credential required');let d=cipher.decrypt(matches[0].data);return typeof d==='string'?JSON.parse(d):d;};
 const oauth=(type,name)=>{const d=one(type,name);let t=d.oauthTokenData;if(typeof t==='string')t=JSON.parse(t);if(!t?.refresh_token)throw Error('OAuth reconnection required');return {clientId:d.clientId,clientSecret:d.clientSecret,refreshToken:t.refresh_token};};
 if(!process.env.SUPPORT_CALENDAR_ID)throw Error('Configured support calendar required');
 const worker=one('httpHeaderAuth','Ceroa Workspace privado');
 if(worker.name?.toLowerCase()!=='x-ceroa-workspace'||typeof worker.value!=='string'||worker.value.length<32)throw Error('Configured worker credential required');
 return {gmail:oauth('gmailOAuth2','Gmail account'),calendar:oauth('googleCalendarOAuth2Api','Ceroa Calendar'),calendarId:process.env.SUPPORT_CALENDAR_ID,workerKey:worker.value};
};
