const fs=require('fs');let input='';process.stdin.on('data',b=>input+=b);process.stdin.on('end',()=>{
  let db;
  try{
    const values=JSON.parse(input);if(!/^[a-f0-9]{64}$/.test(values.RAG_WORKER_KEY)||!values.RAG_INDEX_USERNAME?.startsWith('ceroa_rag_indexer.'))throw Error();
    const dir='/usr/local/lib/node_modules/n8n/node_modules/n8n-core/dist/encryption/';
    const {Cipher}=require(dir+'cipher'),{CipherAes256CBC}=require(dir+'aes-256-cbc'),{CipherAes256GCM}=require(dir+'aes-256-gcm');
    const cipher=new Cipher(JSON.parse(fs.readFileSync('/home/node/.n8n/config','utf8')),new CipherAes256GCM(),new CipherAes256CBC(),null);
    const root='/usr/local/lib/node_modules/n8n/node_modules/.pnpm/';const sqlite=require(root+fs.readdirSync(root).find(x=>x.startsWith('sqlite3@'))+'/node_modules/sqlite3');db=new sqlite.Database('/home/node/.n8n/database.sqlite');
    db.get("SELECT nodes FROM workflow_entity WHERE id IN ('ceroaHybridQuery20','ceroaAssistant01') ORDER BY CASE id WHEN 'ceroaHybridQuery20' THEN 0 ELSE 1 END LIMIT 1",(e,row)=>{
      if(e||!row)return fail();const nodes=JSON.parse(row.nodes),model=nodes.find(n=>n.type.includes('lmChatGoogleGemini')),header=nodes.find(n=>n.type==='n8n-nodes-base.webhook').credentials;
      db.get('SELECT data FROM credentials_entity WHERE id=?',[model.credentials.googlePalmApi.id],(e,cred)=>{
        try{
          if(e||!cred)throw Error();const data=cipher.decrypt(cred.data);const google=typeof data==='string'?JSON.parse(data):data;
          const url=new URL(values.RAG_DB_URL.replace(/^jdbc:/,''));if(!url.hostname.endsWith('supabase.com'))throw Error();
          const credentials=[
            {id:'ceroaRagKey03',name:'Ceroa RAG privado',type:'httpHeaderAuth',data:cipher.encrypt({name:'X-Ceroa-Rag',value:values.RAG_WORKER_KEY})},
            {id:'ceroaRagGemini03',name:'Ceroa RAG Gemini Embeddings',type:'httpHeaderAuth',data:cipher.encrypt({name:'x-goog-api-key',value:google.apiKey})},
            {id:'ceroaRagIndexer03',name:'Ceroa RAG indexador Supabase',type:'postgres',data:cipher.encrypt({host:url.hostname,port:Number(url.port)||5432,database:url.pathname.slice(1),user:values.RAG_INDEX_USERNAME,password:values.RAG_INDEX_PASSWORD,ssl:'require',allowUnauthorizedCerts:true})}
          ];
          fs.writeFileSync('/tmp/ceroa-rag-credentials.json',JSON.stringify(credentials),{mode:0o600});
          for(const file of ['rag-embedding','rag-index','assistant-rag']){
            const workflow=JSON.parse(fs.readFileSync('/opt/ceroa-workflows/'+file+'.json','utf8'));
            for(const node of workflow.nodes){
              if(node.name==='Embedding Gemini'||node.name==='Embedding de documentos'){
                node.parameters.authentication='genericCredentialType';delete node.parameters.nodeCredentialType;node.parameters.genericAuthType='httpHeaderAuth';node.credentials={httpHeaderAuth:{id:'ceroaRagGemini03',name:'Ceroa RAG Gemini Embeddings'}};
              }else if(node.type==='n8n-nodes-base.postgres')node.credentials={postgres:{id:'ceroaRagIndexer03',name:'Ceroa RAG indexador Supabase'}};
              else if(file==='rag-embedding'&&node.type==='n8n-nodes-base.webhook')node.credentials={httpHeaderAuth:{id:'ceroaRagKey03',name:'Ceroa RAG privado'}};
              else if(node.type.includes('lmChatGoogleGemini')||node.parameters.nodeCredentialType==='googlePalmApi')node.credentials=model.credentials;
              else if(file==='assistant-rag'&&(node.parameters.authentication==='headerAuth'||node.parameters.genericAuthType==='httpHeaderAuth'))node.credentials=header;
            }
            fs.writeFileSync('/tmp/ceroa-'+file+'-installed.json',JSON.stringify(workflow),{mode:0o600});
          }
          console.log('RAG credentials encrypted and workflows associated. No publication.');db.close();
        }catch(e){fail();}
      });
    });
    function fail(){console.log('RAG credential preparation failed; no secret output.');process.exitCode=1;db.close();}
  }catch(e){console.log('RAG credential preparation failed; no secret output.');process.exitCode=1;db?.close();}
});
