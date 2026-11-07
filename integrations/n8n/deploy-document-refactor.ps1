$ErrorActionPreference='Stop'
$workspace=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$stamp=Get-Date -Format 'yyyyMMdd-HHmmss'
$privateDir=Join-Path $workspace "tmp/n8n-refactor-$stamp"
$backupDir=Join-Path $workspace 'backups/n8n'
New-Item -ItemType Directory -Path $privateDir | Out-Null
function Invoke-DockerChecked {
  & docker @args
  if($LASTEXITCODE -ne 0){throw 'La operación Docker falló; no continuar con la publicación'}
}
Invoke-DockerChecked exec ceroa-n8n n8n export:workflow --all --output=/tmp/ceroa-refactor-drafts.json
Invoke-DockerChecked exec ceroa-n8n n8n export:workflow --all --published --output=/tmp/ceroa-refactor-published.json
Invoke-DockerChecked cp ceroa-n8n:/tmp/ceroa-refactor-drafts.json (Join-Path $privateDir 'drafts.json')
Invoke-DockerChecked cp ceroa-n8n:/tmp/ceroa-refactor-published.json (Join-Path $privateDir 'published.json')
$keyPath=Join-Path $backupDir "refactor-$stamp.key"
node (Join-Path $PSScriptRoot 'backup-crypto.mjs') encrypt (Join-Path $privateDir 'drafts.json') (Join-Path $backupDir "refactor-$stamp-drafts.ceroa") $keyPath
if($LASTEXITCODE -ne 0){throw 'Falló el respaldo cifrado de borradores'}
node (Join-Path $PSScriptRoot 'backup-crypto.mjs') encrypt-existing (Join-Path $privateDir 'published.json') (Join-Path $backupDir "refactor-$stamp-published.ceroa") $keyPath
if($LASTEXITCODE -ne 0){throw 'Falló el respaldo cifrado de versiones publicadas'}
$live=Get-Content -LiteralPath (Join-Path $privateDir 'published.json') -Raw | ConvertFrom-Json
if($live.id -contains 'ceroaDocumentProcessor22'){
  foreach($id in @('ceroaRagIngest20','ceroaRagSync20')){
    $adapter=$live | Where-Object id -eq $id
    if($adapter.nodes.Count -ne 2 -or $adapter.nodes[1].parameters.workflowId.value -ne 'ceroaDocumentProcessor22'){
      throw 'Despliegue parcial detectado. Conciliar los adaptadores; no sobrescribirlos automáticamente.'
    }
  }
  Write-Output 'El procesador compartido ya está publicado. Respaldos conservados; no se sobrescribió ningún workflow.'
  return
}
node (Join-Path $PSScriptRoot 'prepare-document-refactor.mjs') (Join-Path $privateDir 'published.json') (Join-Path $privateDir 'prepared')
if($LASTEXITCODE -ne 0){throw 'No se pudieron conciliar los procesadores publicados'}
& (Join-Path $PSScriptRoot 'test-document-runtime.ps1')
$remoteDir="/tmp/ceroa-document-refactor-$stamp"
Invoke-DockerChecked cp (Join-Path $privateDir 'prepared') "ceroa-n8n:$remoteDir"
foreach($id in @('ceroaDocumentProcessor22','ceroaRagIngest20','ceroaRagSync20')){
  Invoke-DockerChecked exec ceroa-n8n n8n import:workflow "--input=$remoteDir/$id.json"
  Invoke-DockerChecked exec ceroa-n8n n8n publish:workflow "--id=$id"
}
Invoke-DockerChecked restart ceroa-n8n
Write-Output 'Tres workflows publicados. Verificar readiness, reconciliación de publicaciones y el rechazo del webhook sin credencial antes de pruebas funcionales.'
