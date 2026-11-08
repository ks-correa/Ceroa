// Offline verification only. Mount a restored n8n volume; do not contact providers or print secrets.
const fs=require('node:fs');const root='/usr/local/lib/node_modules/n8n/node_modules/.pnpm/';
const sqlite=require(root+fs.readdirSync(root).find(x=>x.startsWith('sqlite3@'))+'/node_modules/sqlite3');
const dir='/usr/local/lib/node_modules/n8n/node_modules/n8n-core/dist/encryption/';const {Cipher}=require(dir+'cipher'),{CipherAes256CBC}=require(dir+'aes-256-cbc'),{CipherAes256GCM}=require(dir+'aes-256-gcm');
const cipher=new Cipher(JSON.parse(fs.readFileSync('/home/node/.n8n/config','utf8')),new CipherAes256GCM(),new CipherAes256CBC(),null);
const db=new sqlite.Database('/home/node/.n8n/database.sqlite',sqlite.OPEN_READONLY);
db.all('SELECT id,name,type,data FROM credentials_entity',(error,credentials)=>{try{
 if(error)throw Error();const details=credentials.map(row=>{let data=cipher.decrypt(row.data);if(typeof data==='string')data=JSON.parse(data);let token=data.oauthTokenData;if(typeof token==='string')token=JSON.parse(token);return{name:row.name,type:row.type,decrypted:true,...(/OAuth2|gmailOAuth2/.test(row.type)?{clientConfigured:!!data.clientId&&!!data.clientSecret,oauthTokenStored:!!token?.access_token}:{}),...(row.type==='googlePalmApi'?{apiKeyStored:!!data.apiKey}:{})};});
 db.get('SELECT count(*) AS workflows, sum(CASE WHEN activeVersionId IS NOT NULL THEN 1 ELSE 0 END) AS published FROM workflow_entity',(e,counts)=>{if(e){console.log(JSON.stringify({status:'FAILED',noSecretOutput:true}));process.exitCode=1;}else console.log(JSON.stringify({status:'VERIFIED_OFFLINE',credentials:details,counts}));db.close();});
 }catch{console.log(JSON.stringify({status:'FAILED',noSecretOutput:true}));process.exitCode=1;db.close();}});
