param([Parameter(Mandatory=$true)][string]$PublishedBackup,[Parameter(Mandatory=$true)][string]$KeyFile)
$ErrorActionPreference='Stop'
$workspace=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$restoreDir=Join-Path $workspace ('tmp/n8n-query-restore-'+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $restoreDir | Out-Null
$decrypted=Join-Path $restoreDir 'published.json'
node (Join-Path $PSScriptRoot 'backup-crypto.mjs') decrypt $PublishedBackup $decrypted $KeyFile
if($LASTEXITCODE -ne 0){throw 'No se pudo autenticar el respaldo'}
$all=Get-Content -LiteralPath $decrypted -Raw -Encoding UTF8 | ConvertFrom-Json
$original=$all | Where-Object id -eq 'ceroaHybridQuery20'
if(!$original -or $original.nodes.name -notcontains 'Validar respuesta' -or $original.nodes.name -notcontains 'Preparar contexto en Spring Boot'){throw 'El respaldo no contiene el contrato esperado de consultas'}
$path=Join-Path $restoreDir 'query.json'
[IO.File]::WriteAllText($path,($original | ConvertTo-Json -Depth 100),[Text.UTF8Encoding]::new($false))
docker cp $path ceroa-n8n:/tmp/ceroa-query-restore.json
if($LASTEXITCODE -ne 0){throw 'No se pudo copiar la definición original'}
docker exec ceroa-n8n n8n import:workflow --input=/tmp/ceroa-query-restore.json
if($LASTEXITCODE -ne 0){throw 'No se pudo importar la definición original'}
docker exec ceroa-n8n n8n publish:workflow --id=ceroaHybridQuery20
if($LASTEXITCODE -ne 0){throw 'No se pudo publicar la definición original'}
docker restart ceroa-n8n
if($LASTEXITCODE -ne 0){throw 'No se pudo reiniciar n8n'}
Write-Output 'Consulta original restaurada. Verificar readiness y reconciliación antes de usar el asistente.'
