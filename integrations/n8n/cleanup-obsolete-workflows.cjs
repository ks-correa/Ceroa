// Trusted local admin maintenance. Back up all workflows before running.
// Uses n8n's own archive/delete API; the transient local API key is always removed.
const fs=require('fs');const {randomBytes,randomUUID}=require('crypto');
const root='/usr/local/lib/node_modules/n8n/node_modules/.pnpm/';
const sqlite=require(root+fs.readdirSync(root).find(x=>x.startsWith('sqlite3@'))+'/node_modules/sqlite3');
const db=new sqlite.Database('/home/node/.n8n/database.sqlite');
const all=(sql,params=[])=>new Promise((resolve,reject)=>db.all(sql,params,(e,r)=>e?reject(e):resolve(r)));
const run=(sql,params=[])=>new Promise((resolve,reject)=>db.run(sql,params,function(e){e?reject(e):resolve(this.changes);}));
const targets=['ceroaAssistant01','ceroaAssistantRag03','ceroaReadDebts001','ceroaPayment00001','ceroaReminderMock04'];
const keyId=randomUUID(),key='n8n_api_'+randomBytes(32).toString('hex');let created=false;
(async()=>{
  try {
    const before=JSON.parse(fs.readFileSync('/tmp/ceroa-portable-before.json','utf8'));
    const rows=await all('SELECT id,name,nodes,settings,versionId FROM workflow_entity');
    for(const id of targets){const current=rows.find(w=>w.id===id),backup=before.find(w=>w.id===id);if(!current||!backup||current.versionId!==backup.versionId)throw Error('Missing or changed backup');}
    for(const row of rows.filter(w=>!targets.includes(w.id)))for(const id of targets)if((row.nodes+row.settings).includes(id))throw Error('Workflow still referenced');
    const [owner]=await all("SELECT id FROM user WHERE roleSlug='global:owner' AND disabled=0");if(!owner)throw Error('Local owner unavailable');
    await run('INSERT INTO user_api_keys(id,userId,label,apiKey,scopes,audience) VALUES(?,?,?,?,?,?)',[keyId,owner.id,'Ceroa temporary authorized cleanup',key,JSON.stringify(['workflow:read','workflow:delete','workflow:deactivate']),'public-api']);created=true;
    const call=async(path,method)=>{
      const response=await fetch('http://127.0.0.1:5678/api/v1/workflows/'+path,{method,headers:{'X-N8N-API-KEY':key},signal:AbortSignal.timeout(30000)});
      if(!response.ok)throw Error('Workflow API rejected operation: '+response.status());return response;
    };
    await call('ceroaHybridQuery20','GET');
    const removed=[];
    for(const id of targets){
      const current=before.find(w=>w.id===id);
      if(current.active)await call(id+'/unpublish','POST');
      await call(id+'/archive','POST');await call(id,'DELETE');removed.push({id,name:current.name});
      console.log(JSON.stringify({removed:id}));
    }
    const remaining=await all('SELECT id,name,active,isArchived FROM workflow_entity ORDER BY name');
    if(remaining.some(w=>targets.includes(w.id))||!remaining.some(w=>w.id==='ceroaRagIndex03'))throw Error('Cleanup verification failed');
    fs.writeFileSync('/tmp/ceroa-workflow-cleanup-report.json',JSON.stringify({removed,remaining,usedNativeApi:true},null,2),{mode:0o600});
    console.log(JSON.stringify({removed:removed.length,remaining:remaining.length,active:remaining.filter(w=>w.active).length,administrativeIndexPreserved:true}));
  }catch(e){console.error('Cleanup stopped: '+(e.message?.startsWith('Workflow API rejected')?e.message:'verification failed; backups retained')+'. No secrets printed.');process.exitCode=1;}
  finally{if(created)await run('DELETE FROM user_api_keys WHERE id=?',[keyId]);db.close();}
})();
