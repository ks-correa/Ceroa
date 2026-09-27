$ErrorActionPreference = 'Stop'
$workspace = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Push-Location $workspace
try {
  $privatePath = Join-Path $workspace '.env'
  $privateContent = [IO.File]::ReadAllText($privatePath)
  $match = [regex]::Match($privateContent,'(?m)^DOCUMENTS_WORKER_KEY=([^\r\n]+)')
  $workerKey = if($match.Success){$match.Groups[1].Value}else{[guid]::NewGuid().ToString('N')+[guid]::NewGuid().ToString('N')}
  if($workerKey.Length -lt 32){throw 'DOCUMENTS_WORKER_KEY debe tener al menos 32 caracteres.'}
  $values=@{DOCUMENTS_ENABLED='true';DOCUMENTS_WEBHOOK_URL='http://n8n:5678/webhook/ceroa-document-draft-v1';DOCUMENTS_WORKER_KEY=$workerKey}
  foreach($name in $values.Keys){$pattern='(?m)^'+$name+'=[^\r\n]*';if([regex]::IsMatch($privateContent,$pattern)){$privateContent=[regex]::Replace($privateContent,$pattern,$name+'='+$values[$name])}else{$privateContent+="`n$name=$($values[$name])`n"}}
  [IO.File]::WriteAllText($privatePath,$privateContent)
  node integrations/n8n/build-document-workflow.mjs
  if($LASTEXITCODE -ne 0){throw 'No se pudo generar el flujo.'}
  $installer=@'
const fs=require('fs');let input='';process.stdin.on('data',b=>input+=b);process.stdin.on('end',()=>{
try{
 const body=JSON.parse(input);if(typeof body.workerKey!=='string'||body.workerKey.length<32)throw new Error();
 const core='/usr/local/lib/node_modules/n8n/node_modules/n8n-core/dist/encryption/';
 const {Cipher}=require(core+'cipher');const {CipherAes256CBC}=require(core+'aes-256-cbc');const {CipherAes256GCM}=require(core+'aes-256-gcm');
 const settings=JSON.parse(fs.readFileSync('/home/node/.n8n/config','utf8'));
 const cipher=new Cipher(settings,new CipherAes256GCM(),new CipherAes256CBC(),null);
 fs.writeFileSync('/tmp/ceroa-document-credential.json',JSON.stringify([{id:'ceroaDocumentKey02',name:'Ceroa Documentos',type:'httpHeaderAuth',data:cipher.encrypt({name:'X-Ceroa-Documents',value:body.workerKey})}]),{mode:0o600});
 const root='/usr/local/lib/node_modules/n8n/node_modules/.pnpm/';const folder=fs.readdirSync(root).find(n=>n.startsWith('sqlite3@'));const sqlite=require(root+folder+'/node_modules/sqlite3');const db=new sqlite.Database('/home/node/.n8n/database.sqlite');
 db.get('select nodes from workflow_entity where id=?',['ceroaAssistant01'],(e,row)=>{
  try{if(e||!row)throw new Error();const model=JSON.parse(row.nodes).find(n=>n.type.includes('lmChatGoogleGemini'));if(!model?.credentials?.googlePalmApi)throw new Error();
   const workflow=JSON.parse(fs.readFileSync('/opt/ceroa-workflows/document-ingestion.json','utf8'));
   for(const node of workflow.nodes){if(node.type.includes('lmChatGoogleGemini'))node.credentials=model.credentials;else if(node.parameters.authentication==='headerAuth'||node.type==='n8n-nodes-base.httpRequest')node.credentials={httpHeaderAuth:{id:'ceroaDocumentKey02',name:'Ceroa Documentos'}};}
   fs.writeFileSync('/tmp/ceroa-document-installed.json',JSON.stringify(workflow),{mode:0o600});console.log('Flujo preparado; clave cifrada.');
  }catch(e){console.log('No se pudo asociar el modelo existente.');process.exitCode=1;}finally{db.close();}
 });
}catch(e){console.log('No se pudo preparar la credencial cifrada.');process.exitCode=1;}
});
'@
  $installerFile=Join-Path $env:TEMP 'ceroa-documents-install.js'
  [IO.File]::WriteAllText($installerFile,$installer)
  docker cp $installerFile ceroa-n8n:/tmp/ceroa-documents-install.js
  @{workerKey=$workerKey}|ConvertTo-Json -Compress|docker exec -i ceroa-n8n node /tmp/ceroa-documents-install.js
  if($LASTEXITCODE -ne 0){throw 'No se pudo preparar la instalación privada.'}
  docker exec ceroa-n8n n8n import:credentials --input=/tmp/ceroa-document-credential.json
  if($LASTEXITCODE -ne 0){throw 'No se pudo importar la credencial cifrada.'}
  docker exec ceroa-n8n n8n import:workflow --input=/tmp/ceroa-document-installed.json
  if($LASTEXITCODE -ne 0){throw 'No se pudo importar el flujo.'}
  $compose=@('compose','--env-file','.env')
  if(Test-Path .env.telegram-local){$compose+=@('--env-file','.env.telegram-local')}
  $compose+=@('-f','docker-compose.yml','-f','docker-compose.n8n.yml','-f','docker-compose.n8n-sandbox.yml')
  if(Test-Path .env.telegram-local){$compose+=@('-f','docker-compose.telegram-local.yml')}
  $ErrorActionPreference='Continue'
  & docker @compose up -d --no-deps backend frontend
  $ErrorActionPreference='Stop'
  if($LASTEXITCODE -ne 0){throw 'No se pudo actualizar Ceroa.'}
  docker exec ceroa-n8n n8n publish:workflow --id=ceroaDocuments02
  if($LASTEXITCODE -ne 0){throw 'No se pudo publicar el flujo.'}
  docker restart ceroa-n8n
  if($LASTEXITCODE -ne 0){throw 'No se pudo reiniciar n8n.'}
  Write-Output 'RA-N8N-002 instalado. Abre Registrar/Editar obligación > Leer documento financiero.'
} finally {Pop-Location}
