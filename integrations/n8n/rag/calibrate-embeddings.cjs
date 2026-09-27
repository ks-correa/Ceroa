// Run inside n8n. Only approved-product questions and unrelated synthetic negatives.
const fs=require('fs');const root='/usr/local/lib/node_modules/n8n/node_modules/.pnpm/';
const sqlite=require(root+fs.readdirSync(root).find(x=>x.startsWith('sqlite3@'))+'/node_modules/sqlite3');
const db=new sqlite.Database('/home/node/.n8n/database.sqlite');
db.get('SELECT data FROM credentials_entity WHERE id=?',['ceroaRagGemini03'],async(e,row)=>{
  db.close();try{
    if(e||!row)throw Error();const dir='/usr/local/lib/node_modules/n8n/node_modules/n8n-core/dist/encryption/';
    const {Cipher}=require(dir+'cipher'),{CipherAes256CBC}=require(dir+'aes-256-cbc'),{CipherAes256GCM}=require(dir+'aes-256-gcm');
    const cipher=new Cipher(JSON.parse(fs.readFileSync('/home/node/.n8n/config','utf8')),new CipherAes256GCM(),new CipherAes256CBC(),null);
    const decoded=cipher.decrypt(row.data);const credential=typeof decoded==='string'?JSON.parse(decoded):decoded;
    const cases=[
      ['¿Qué es la estrategia Bola de Nieve en Ceroa?',true,'docs/knowledge/estrategias.md'],
      ['¿Qué es Avalancha y cómo prioriza las deudas?',true,'docs/knowledge/estrategias.md'],
      ['¿Una tasa mensual se compara directamente con una anual?',true,'docs/knowledge/estrategias.md'],
      ['¿Cuáles formatos puedo subir para leer un documento financiero?',true,'docs/knowledge/registro-y-consultas.md'],
      ['¿La lectura de un documento guarda la deuda automáticamente?',true,'docs/knowledge/registro-y-consultas.md'],
      ['¿El próximo vencimiento demuestra un día de pago fijo cada mes?',true,'docs/knowledge/registro-y-consultas.md'],
      ['¿Qué tiempo hará mañana en Bogotá?',false,''],
      ['Dame una receta para hacer pan de chocolate.',false,''],
      ['¿Quién ganó el campeonato mundial de fútbol?',false,''],
      ['¿Cuál es el precio actual de bitcoin?',false,''],
      ['¿Cuál es la tasa de usura vigente hoy en Colombia?',false,''],
      ['¿Qué aseguradora cubre daños por terremoto?',false,'']
    ];
    const output=[];for(const [question,positive,source]of cases){
      const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':credential.value},body:JSON.stringify({model:'models/gemini-embedding-001',content:{parts:[{text:question}]},taskType:'RETRIEVAL_QUERY',outputDimensionality:768})});
      const data=await response.json();const values=data.embedding?.values;if(!response.ok||!Array.isArray(values)||values.length!==768||values.some(v=>!Number.isFinite(v)))throw Error();
      const norm=Math.sqrt(values.reduce((s,v)=>s+v*v,0));output.push({question,positive,source,vector:values.map(v=>v/norm)});
    }
    fs.writeFileSync('/tmp/ceroa-rag-calibration-vectors.json',JSON.stringify(output),{mode:0o600});
    console.log(`Embedding calibration inputs prepared: ${output.length}; dimensions: 768. No financial data or credential output.`);
  }catch(e){console.log('Embedding calibration failed; no credential output.');process.exitCode=1;}
});
