// Run inside the trusted n8n container. Read-only Google calls; secrets stay in memory.
const fs=require('node:fs');
const root='/usr/local/lib/node_modules/n8n/node_modules/.pnpm/';
const sqlite=require(root+fs.readdirSync(root).find(x=>x.startsWith('sqlite3@'))+'/node_modules/sqlite3');
const dir='/usr/local/lib/node_modules/n8n/node_modules/n8n-core/dist/encryption/';
const {Cipher}=require(dir+'cipher'),{CipherAes256CBC}=require(dir+'aes-256-cbc'),{CipherAes256GCM}=require(dir+'aes-256-gcm');
const cipher=new Cipher(JSON.parse(fs.readFileSync('/home/node/.n8n/config','utf8')),new CipherAes256GCM(),new CipherAes256CBC(),null);
const db=new sqlite.Database('/home/node/.n8n/database.sqlite',sqlite.OPEN_READONLY);
const allowed=new Set(['gmailOAuth2','googleDriveOAuth2Api','googleSheetsOAuth2Api','googleCalendarOAuth2Api']);
const safe=value=>typeof value==='string'&&/^[A-Za-z0-9_.-]{1,80}$/.test(value)?value:'UNKNOWN';
async function probe(row){
 const result={id:row.id,name:row.name,type:row.type};
 try{
  let data=cipher.decrypt(row.data);if(typeof data==='string')data=JSON.parse(data);
  let token=data.oauthTokenData;if(typeof token==='string')token=JSON.parse(token);
  if(!token){result.status='CONSENT_REQUIRED';return result;}
  result.scopes=typeof token.scope==='string'?token.scope.split(' '):[];
  let access=token.access_token;
  if(token.refresh_token&&data.clientId&&data.clientSecret){
   const refreshed=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',refresh_token:token.refresh_token,client_id:data.clientId,client_secret:data.clientSecret}),signal:AbortSignal.timeout(15000)});
   const body=await refreshed.json();if(!refreshed.ok){result.status='OAUTH_REFRESH_FAILED';result.httpStatus=refreshed.status;result.error=safe(body.error);return result;}access=body.access_token;result.refreshVerified=true;
  }
  if(!access){result.status='CONSENT_REQUIRED';return result;}
  let url=row.type==='gmailOAuth2'?'https://gmail.googleapis.com/gmail/v1/users/me/profile':row.type==='googleCalendarOAuth2Api'?'https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=20':'https://www.googleapis.com/drive/v3/files?pageSize=30&fields=files(id,name,mimeType,capabilities(canEdit,canAddChildren))&q='+encodeURIComponent(row.type==='googleSheetsOAuth2Api'?"trashed = false and mimeType = 'application/vnd.google-apps.spreadsheet'":"trashed = false and mimeType = 'application/vnd.google-apps.folder' and name contains 'Ceroa'");
  const response=await fetch(url,{headers:{Authorization:'Bearer '+access},signal:AbortSignal.timeout(15000)});const body=await response.json();result.httpStatus=response.status;
  if(!response.ok){result.status='API_REJECTED';result.error=safe(body.error?.status);return result;}
  result.status='READ_VERIFIED';if(row.type==='gmailOAuth2')result.accountEmail=body.emailAddress;else if(row.type==='googleCalendarOAuth2Api')result.calendars=(body.items??[]).map(c=>({id:c.id,name:c.summary,accessRole:c.accessRole}));else result.resources=body.files??[];
  return result;
 }catch{result.status='PROBE_FAILED';return result;}
}
db.all('SELECT id,name,type,data FROM credentials_entity',async(error,rows)=>{
 if(error){console.log(JSON.stringify({status:'INVENTORY_FAILED'}));process.exitCode=1;db.close();return;}
 const results=[];for(const row of rows.filter(r=>allowed.has(r.type)&&(process.argv[2]!=='calendar-only'||r.type==='googleCalendarOAuth2Api')))results.push(await probe(row));
 console.log(JSON.stringify({readOnly:true,credentials:results}));db.close();
});
