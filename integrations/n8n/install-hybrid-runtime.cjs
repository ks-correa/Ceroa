// Run only inside the trusted n8n container. Receives a private key on stdin, never logs it.
const fs=require('fs');let input='';
process.stdin.on('data',b=>input+=b);
process.stdin.on('end',()=>{
  let db;
  try {
    const values=JSON.parse(input);
    if(!/^[a-f0-9]{64}$/.test(values.workerKey))throw Error('Invalid worker key');
    const root='/usr/local/lib/node_modules/n8n/node_modules/.pnpm/';
    const sqlite=require(root+fs.readdirSync(root).find(x=>x.startsWith('sqlite3@'))+'/node_modules/sqlite3');
    const dir='/usr/local/lib/node_modules/n8n/node_modules/n8n-core/dist/encryption/';
    const {Cipher}=require(dir+'cipher'),{CipherAes256CBC}=require(dir+'aes-256-cbc'),{CipherAes256GCM}=require(dir+'aes-256-gcm');
    const cipher=new Cipher(JSON.parse(fs.readFileSync('/home/node/.n8n/config','utf8')),new CipherAes256GCM(),new CipherAes256CBC(),null);
    db=new sqlite.Database('/home/node/.n8n/database.sqlite',sqlite.OPEN_READONLY);
    db.get("SELECT nodes FROM workflow_entity WHERE id IN ('ceroaHybridQuery20','ceroaAssistantRag03') ORDER BY CASE id WHEN 'ceroaHybridQuery20' THEN 0 ELSE 1 END LIMIT 1",(e,row)=>{
      try {
        if(e||!row)throw Error('Existing assistant missing');
        const existing=JSON.parse(row.nodes),byName=new Map(existing.map(n=>[n.name,n]));
        const model=existing.find(n=>n.type.includes('lmChatGoogleGemini'));
        const header=existing.find(n=>n.type==='n8n-nodes-base.webhook').credentials;
        if(!model?.credentials?.googlePalmApi||!header?.httpHeaderAuth)throw Error('Existing associations missing');
        fs.writeFileSync('/tmp/ceroa-hybrid-credentials.json',JSON.stringify([
          {id:'ceroaLibraryWorker20',name:'Ceroa biblioteca privada',type:'httpHeaderAuth',data:cipher.encrypt({name:'X-Ceroa-Library',value:values.workerKey})},
          {id:'ceroaLibraryOcr21',name:'Ceroa OCR privado',type:'httpHeaderAuth',data:cipher.encrypt({name:'X-Ceroa-Ocr',value:values.workerKey})},
          {id:'ceroaSupabaseGateway21',name:'Ceroa Supabase · Gateway restringido',type:'supabaseApi',data:cipher.encrypt({host:'http://backend:8080/api/v1/library-supabase',serviceRole:values.workerKey})}
        ]),{mode:0o600});
        for(const file of ['hybrid-rag-ingestion','hybrid-rag-sync','hybrid-rag-query','hybrid-rag-ocr']) {
          const w=JSON.parse(fs.readFileSync('/opt/ceroa-workflows/'+file+'.json','utf8'));
          w.active=false;
          for(const n of w.nodes) {
            if(n.type==='n8n-nodes-base.supabase')n.credentials={supabaseApi:{id:'ceroaSupabaseGateway21',name:'Ceroa Supabase · Gateway restringido'}};
            else if(n.name==='Embedding de fragmentos'||n.name==='Gemini · Leer PDF escaneado'){
              n.parameters.authentication='genericCredentialType';delete n.parameters.nodeCredentialType;n.parameters.genericAuthType='httpHeaderAuth';
              n.credentials={httpHeaderAuth:{id:'ceroaRagGemini03',name:'Ceroa RAG Gemini Embeddings'}};
            } else if(file==='hybrid-rag-ocr'&&n.type==='n8n-nodes-base.webhook')n.credentials={httpHeaderAuth:{id:'ceroaLibraryOcr21',name:'Ceroa OCR privado'}};
            else if(n.type.includes('lmChatGoogleGemini'))n.credentials=model.credentials;
            else if(file==='hybrid-rag-query'){
              if(byName.get(n.name)?.credentials)n.credentials=byName.get(n.name).credentials;
              else if(n.parameters.genericAuthType==='httpHeaderAuth')n.credentials=header;
            } else if(n.parameters.authentication==='headerAuth'||n.parameters.genericAuthType==='httpHeaderAuth')n.credentials={httpHeaderAuth:{id:'ceroaLibraryWorker20',name:'Ceroa biblioteca privada'}};
          }
          fs.writeFileSync('/tmp/ceroa-'+file+'-installed.json',JSON.stringify(w),{mode:0o600});
        }
        console.log('Four inactive workflows prepared. Existing Gemini key reused; Supabase uses restricted gateway credential.');db.close();
      }catch(e){fail();}
    });
  }catch(e){fail();}
  function fail(){console.error('Hybrid installation preparation failed; no secret output.');process.exitCode=1;db?.close();}
});
