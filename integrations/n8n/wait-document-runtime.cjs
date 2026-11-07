// Disposable test container only. No production DB access.
const fs=require('fs');
const root='/usr/local/lib/node_modules/n8n/node_modules/.pnpm/';
const sqlite=require(root+fs.readdirSync(root).find(x=>x.startsWith('sqlite3@'))+'/node_modules/sqlite3');
const deadline=Date.now()+45000;
(async()=>{
 while(Date.now()<deadline){
  const ready=await fetch('http://127.0.0.1:5678/healthz/readiness').then(r=>r.ok).catch(()=>false);
  if(ready){
   const db=new sqlite.Database('/home/node/.n8n/database.sqlite',sqlite.OPEN_READONLY);
   const found=await new Promise(resolve=>db.get('SELECT * FROM workflow_published_version WHERE workflowId=?',['ceroaFixtureWorker22'],(e,row)=>{db.close();resolve(!e&&!!row);}));
   if(found){console.log('Disposable worker publication reconciled.');return;}
  }
  await new Promise(resolve=>setTimeout(resolve,500));
 }
 throw Error('Disposable worker publication did not become ready');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
