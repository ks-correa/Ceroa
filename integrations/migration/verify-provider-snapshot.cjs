const {DatabaseSync}=require('node:sqlite'),{createHash}=require('node:crypto');
const db=new DatabaseSync('/data/provider.sqlite',{readOnly:true});
try{if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('Invalid durable journal');const rows=db.prepare('SELECT proposal,fingerprint,status,receipt FROM drafts ORDER BY proposal').all();console.log(JSON.stringify({valid:true,receipts:rows.length,sha256:createHash('sha256').update(JSON.stringify(rows)).digest('hex')}));}finally{db.close();}
