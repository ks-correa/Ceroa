$ErrorActionPreference='Stop'
$workspace=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Push-Location $workspace
try {
  node integrations/n8n/rag/prepare-corpus.mjs
  if($LASTEXITCODE -ne 0){throw 'No hay corpus aprobado e íntegro.'}
  node integrations/n8n/build-rag-workflows.mjs
  if($LASTEXITCODE -ne 0){throw 'No se pudieron preparar los flujos RAG.'}
  $private=[IO.File]::ReadAllText((Join-Path $workspace '.env'))
  $private+="`n"+[IO.File]::ReadAllText((Join-Path $workspace '.env.rag-admin'))
  $values=@{}
  foreach($name in @('RAG_WORKER_KEY','RAG_DB_URL','RAG_INDEX_USERNAME','RAG_INDEX_PASSWORD')){
    $match=[regex]::Match($private,'(?m)^'+$name+'=([^\r\n]+)')
    if(!$match.Success){throw 'Primero provisiona el esquema y los roles auxiliares de Supabase.'}
    $values[$name]=$match.Groups[1].Value
  }
  docker cp integrations/n8n/rag/install-runtime.cjs ceroa-n8n:/tmp/ceroa-rag-install-runtime.cjs
  $values|ConvertTo-Json -Compress|docker exec -i ceroa-n8n node /tmp/ceroa-rag-install-runtime.cjs
  if($LASTEXITCODE -ne 0){throw 'No se pudieron asociar las credenciales privadas.'}
  docker exec ceroa-n8n n8n import:credentials --input=/tmp/ceroa-rag-credentials.json
  if($LASTEXITCODE -ne 0){throw 'No se pudieron importar credenciales cifradas.'}
  foreach($workflow in @('rag-embedding','rag-index','assistant-rag')){
    docker exec ceroa-n8n n8n import:workflow --input=/tmp/ceroa-$workflow-installed.json
    if($LASTEXITCODE -ne 0){throw 'No se pudo importar un workflow RAG.'}
  }
  Write-Output 'Flujos RAG instalados, inactivos. Ejecuta la indexación administrativa y calibra antes de publicar.'
} finally {Pop-Location}
