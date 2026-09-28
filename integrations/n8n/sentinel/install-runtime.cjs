const fs=require('fs');let input='';process.stdin.on('data',b=>input+=b);process.stdin.on('end',()=>{
  let db;try{
    const {key}=JSON.parse(input);if(!/^[a-f0-9]{64}$/.test(key))throw Error();
    const dir='/usr/local/lib/node_modules/n8n/node_modules/n8n-core/dist/encryption/';
    const {Cipher}=require(dir+'cipher'),{CipherAes256CBC}=require(dir+'aes-256-cbc'),{CipherAes256GCM}=require(dir+'aes-256-gcm');
    const cipher=new Cipher(JSON.parse(fs.readFileSync('/home/node/.n8n/config','utf8')),new CipherAes256GCM(),new CipherAes256CBC(),null);
    const root='/usr/local/lib/node_modules/n8n/node_modules/.pnpm/';const sqlite=require(root+fs.readdirSync(root).find(x=>x.startsWith('sqlite3@'))+'/node_modules/sqlite3');db=new sqlite.Database('/home/node/.n8n/database.sqlite');
    db.get('SELECT nodes FROM workflow_entity WHERE id=?',['ceroaTelegram01'],(e,row)=>{
      try{
        if(e||!row)throw Error();const telegram=JSON.parse(row.nodes).find(n=>n.type==='n8n-nodes-base.telegram')?.credentials;if(!telegram?.telegramApi)throw Error();
        fs.writeFileSync('/tmp/ceroa-sentinel-credentials.json',JSON.stringify([{id:'ceroaSentinelWorker05',name:'Ceroa centinela privado',type:'httpHeaderAuth',data:cipher.encrypt({name:'X-Ceroa-Sentinel',value:key})}]),{mode:0o600});
        for(const name of ['scheduled-sentinel','sentinel-error']){
          const workflow=JSON.parse(fs.readFileSync('/opt/ceroa-workflows/'+name+'.json','utf8'));
          for(const node of workflow.nodes){if(node.type==='n8n-nodes-base.httpRequest')node.credentials={httpHeaderAuth:{id:'ceroaSentinelWorker05',name:'Ceroa centinela privado'}};else if(node.type==='n8n-nodes-base.telegram')node.credentials=telegram;}
          fs.writeFileSync('/tmp/ceroa-'+name+'-installed.json',JSON.stringify(workflow),{mode:0o600});
        }console.log('Centinela asociado a credenciales cifradas; sin publicar ni enviar.');db.close();
      }catch{console.log('No se pudo preparar el centinela.');process.exitCode=1;db.close();}
    });
  }catch{console.log('Configuración privada del centinela inválida.');process.exitCode=1;db?.close();}
});
