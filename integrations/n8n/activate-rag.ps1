# Run after install-rag.ps1, administrative indexing and corpus-specific calibration.
$ErrorActionPreference='Stop'
$workspace=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Push-Location $workspace
try {
  node integrations/n8n/rag/prepare-corpus.mjs
  if($LASTEXITCODE -ne 0){throw 'Las fuentes deben estar aprobadas y conservar su hash.'}
  $classpathFile=Join-Path $workspace 'backend/target/document-test-classpath.txt'
  if(!(Test-Path -LiteralPath $classpathFile)){throw 'Genera el classpath Maven para ejecutar PublishRag.java (ver docs/RA-N8N-003.md).'}
  $ragClasspath=[IO.File]::ReadAllText($classpathFile).Trim()
  java '-Dfile.encoding=UTF-8' -cp $ragClasspath integrations/n8n/rag/PublishRag.java
  if($LASTEXITCODE -ne 0){throw 'El snapshot debe estar indexado y pasar la calibración.'}
  foreach($id in @('ceroaRagEmbedding03','ceroaAssistantRag03')){
    docker exec ceroa-n8n n8n publish:workflow --id=$id
    if($LASTEXITCODE -ne 0){throw 'No se pudo publicar un workflow RAG.'}
  }
  docker restart ceroa-n8n
  if($LASTEXITCODE -ne 0){throw 'No se pudo reiniciar n8n.'}
  $compose=@('compose','--env-file','.env')
  if(Test-Path .env.telegram-local){$compose+=@('--env-file','.env.telegram-local')}
  $compose+=@('-f','docker-compose.yml','-f','docker-compose.n8n.yml','-f','docker-compose.n8n-sandbox.yml')
  if(Test-Path .env.telegram-local){$compose+=@('-f','docker-compose.telegram-local.yml')}
  $ErrorActionPreference='Continue'
  & docker @compose build backend frontend
  if($LASTEXITCODE -ne 0){throw 'No se pudieron construir los servicios.'}
  $privatePath=Join-Path $workspace '.env';$text=[IO.File]::ReadAllText($privatePath)
  foreach($value in @{'RAG_ENABLED'='true';'ASSISTANT_WEBHOOK_URL'='http://n8n:5678/webhook/ceroa-assistant-rag-v1'}.GetEnumerator()){
    $pattern='(?m)^'+$value.Key+'=[^\r\n]*'
    if([regex]::IsMatch($text,$pattern)){$text=[regex]::Replace($text,$pattern,$value.Key+'='+$value.Value)}else{$text+="`n$($value.Key)=$($value.Value)`n"}
  }
  [IO.File]::WriteAllText($privatePath,$text)
  & docker @compose up -d --no-deps backend frontend
  if($LASTEXITCODE -ne 0){throw 'No se pudieron actualizar los servicios.'}
  Write-Output 'RA-N8N-003 activo. Indexación administrativa sin trigger público; finanzas consultadas por el backend.'
} finally {Pop-Location}
