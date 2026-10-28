// Trusted local maintenance, run inside n8n. No credentials or messages are printed.
// Updates only the existing published bot's webhook, without dropping pending updates.
const fs=require('fs');
const root='/usr/local/lib/node_modules/n8n/node_modules/.pnpm/';
const sqlite=require(root+fs.readdirSync(root).find(x=>x.startsWith('sqlite3@'))+'/node_modules/sqlite3');
const db=new sqlite.Database('/home/node/.n8n/database.sqlite',sqlite.OPEN_READONLY);
const get=(sql,args=[])=>new Promise((resolve,reject)=>db.get(sql,args,(e,r)=>e?reject(e):resolve(r)));
(async()=>{
  try {
    const workflow=await get('SELECT h.nodes FROM workflow_entity w JOIN workflow_history h ON h.versionId=w.activeVersionId WHERE w.id=? AND w.active=1',['ceroaTelegram01']);
    if(!workflow)throw Error('Telegram debe estar publicado para restaurar produccion.');
    const trigger=JSON.parse(workflow.nodes).find(n=>n.type==='n8n-nodes-base.telegramTrigger');
    if(!trigger?.webhookId||!trigger.credentials?.telegramApi?.id)throw Error('Falta el trigger publicado o su credencial.');
    const base=new URL(process.env.N8N_WEBHOOK_URL||process.env.WEBHOOK_URL||'');
    if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash)throw Error('Configura una URL HTTPS publica valida.');
    const url=base.href.replace(/\/$/,'')+'/webhook/'+trigger.webhookId+'/webhook';
    const dir='/usr/local/lib/node_modules/n8n/node_modules/n8n-core/dist/encryption/';
    const {Cipher}=require(dir+'cipher'),{CipherAes256CBC}=require(dir+'aes-256-cbc'),{CipherAes256GCM}=require(dir+'aes-256-gcm');
    const cipher=new Cipher(JSON.parse(fs.readFileSync('/home/node/.n8n/config','utf8')),new CipherAes256GCM(),new CipherAes256CBC(),null);
    const row=await get('SELECT data FROM credentials_entity WHERE id=?',[trigger.credentials.telegramApi.id]);
    if(!row)throw Error('No se encontro la credencial Telegram publicada.');
    const credentials=JSON.parse(cipher.decrypt(row.data));
    async function api(method,body) {
      let response;
      for(let attempt=0;attempt<4;attempt++) {
        try {response=await fetch('https://api.telegram.org/bot'+credentials.accessToken+'/'+method,{
          method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body||{}),signal:AbortSignal.timeout(10000)});break;}
        catch(error) {
          if(attempt===3)throw Error('Telegram no responde; conectividad '+(error.cause?.code||error.name||'unavailable')+'.');
          await new Promise(resolve=>setTimeout(resolve,500*(attempt+1)));
        }
      }
      const value=await response.json();
      if(!response.ok||!value.ok)throw Error('Telegram rechazo '+method+' (HTTP '+response.status+').');
      return value.result;
    }
    let info=await api('getWebhookInfo');
    if(process.argv.includes('--apply')) {
      // Secret derivation is the contract of this installed Telegram Trigger version.
      const secret=('ceroaTelegram01_'+trigger.id).replace(/[^a-zA-Z0-9_\-]/g,'');
      const updates=trigger.parameters.updates||['message'];
      await api('setWebhook',{url,secret_token:secret,allowed_updates:updates.includes('*')?[]:updates,drop_pending_updates:false});
      info=await api('getWebhookInfo');
    }
    const matches=info.url===url;
    console.log(JSON.stringify({telegramWebhook:matches?'OK':'URL_MISMATCH',pendingUpdates:info.pending_update_count||0}));
    if(matches&&process.argv.includes('--probe')) {
      const secret=('ceroaTelegram01_'+trigger.id).replace(/[^a-zA-Z0-9_\-]/g,'');
      // No message/chat payload: checks transport without sending a bot message.
      const probe=await fetch(url,{method:'POST',headers:{'content-type':'application/json','x-telegram-bot-api-secret-token':secret},body:JSON.stringify({update_id:0}),signal:AbortSignal.timeout(15000)});
      console.log(JSON.stringify({telegramTransportHttp:probe.status}));
      if(!probe.ok)process.exitCode=1;
    }
    if(!matches)process.exitCode=1;
  } catch(error) {console.error(error.message.startsWith('Telegram')||error.message.startsWith('Configura')?error.message:'No se pudo sincronizar el webhook publicado; no se imprimieron credenciales.');process.exitCode=1;}
  finally {db.close();}
})();
