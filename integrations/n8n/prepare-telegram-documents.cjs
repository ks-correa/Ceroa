// Trusted n8n container only. Reuses encrypted credential associations and private trigger IDs.
const fs=require('fs');
const root='/usr/local/lib/node_modules/n8n/node_modules/.pnpm/';
const sqlite=require(root+fs.readdirSync(root).find(x=>x.startsWith('sqlite3@'))+'/node_modules/sqlite3');
const db=new sqlite.Database('/home/node/.n8n/database.sqlite',sqlite.OPEN_READONLY);
db.get('SELECT nodes FROM workflow_entity WHERE id=?',['ceroaTelegram01'],(err,row)=>{
  try {
    if(err||!row)throw Error('Existing Telegram workflow required');
    const old=JSON.parse(row.nodes);const trigger=old.find(n=>n.type==='n8n-nodes-base.telegramTrigger');
    const worker=old.find(n=>n.name==='Procesar con Ceroa');
    if(!trigger?.credentials?.telegramApi||!trigger.webhookId||!worker?.credentials?.httpHeaderAuth)throw Error('Missing credential associations');
    const workflow=JSON.parse(fs.readFileSync('/opt/ceroa-workflows/assistant-telegram.json','utf8'));
    for(const node of workflow.nodes){
      if(node.type.includes('telegram'))node.credentials=trigger.credentials;
      else if(node.type==='n8n-nodes-base.httpRequest')node.credentials=worker.credentials;
      if(node.type==='n8n-nodes-base.telegramTrigger'){node.id=trigger.id;node.webhookId=trigger.webhookId;}
    }
    workflow.active=false;fs.writeFileSync('/tmp/ceroa-telegram-documents-installed.json',JSON.stringify(workflow),{mode:0o600});
    console.log('Telegram document workflow prepared; existing trigger and credentials preserved. Not published.');
  }catch{console.error('Telegram preparation failed without credential output.');process.exitCode=1;}
  finally{db.close();}
});
