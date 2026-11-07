param(
  [Parameter(Mandatory=$true)][string]$PublishedBackup,
  [Parameter(Mandatory=$true)][string]$KeyFile
)
$ErrorActionPreference='Stop'
$workspace=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$restoreDir=Join-Path $workspace ('tmp/n8n-restore-'+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $restoreDir | Out-Null
$decrypted=Join-Path $restoreDir 'published.json'
node (Join-Path $PSScriptRoot 'backup-crypto.mjs') decrypt $PublishedBackup $decrypted $KeyFile
if($LASTEXITCODE -ne 0){throw 'No se pudo autenticar el respaldo'}
$workflows=Get-Content -LiteralPath $decrypted -Raw -Encoding UTF8 | ConvertFrom-Json
foreach($id in @('ceroaRagIngest20','ceroaRagSync20')){
  $original=$workflows | Where-Object id -eq $id
  if(!$original -or $original.nodes.id -notcontains 'vectors' -or $original.nodes.id -notcontains 'claim'){
    throw 'El respaldo no contiene los procesadores originales; no se modificó n8n'
  }
}
foreach($id in @('ceroaRagIngest20','ceroaRagSync20')){
  $original=$workflows | Where-Object id -eq $id
  $path=Join-Path $restoreDir "$id.json"
  [IO.File]::WriteAllText($path,($original | ConvertTo-Json -Depth 100),[Text.UTF8Encoding]::new($false))
  docker cp $path "ceroa-n8n:/tmp/restore-$id.json"
  if($LASTEXITCODE -ne 0){throw 'No se pudo copiar un workflow de recuperación'}
  docker exec ceroa-n8n n8n import:workflow "--input=/tmp/restore-$id.json"
  if($LASTEXITCODE -ne 0){throw 'No se pudo importar un workflow de recuperación'}
  docker exec ceroa-n8n n8n publish:workflow "--id=$id"
  if($LASTEXITCODE -ne 0){throw 'No se pudo publicar un workflow de recuperación'}
}
docker restart ceroa-n8n
if($LASTEXITCODE -ne 0){throw 'No se pudo reiniciar n8n'}
Write-Output 'Adaptadores originales restaurados. El procesador compartido se conserva para revisión; comprobar readiness y publicaciones.'
