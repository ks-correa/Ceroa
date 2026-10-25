$ErrorActionPreference='Stop'
$workspace=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Push-Location $workspace
try {
 node integrations/n8n/build-hybrid-rag-workflows.mjs
 if($LASTEXITCODE -ne 0){throw 'No se pudieron generar los workflows'}
 $path=Join-Path $workspace '.env';$text=[IO.File]::ReadAllText($path)
 $match=[regex]::Match($text,'(?m)^DOCUMENT_LIBRARY_WORKER_KEY=([^\r\n]+)')
 if($match.Success){$key=$match.Groups[1].Value}else{
  $bytes=New-Object byte[] 32;[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $key=([BitConverter]::ToString($bytes)).Replace('-','').ToLowerInvariant()
  $text+="`nDOCUMENT_LIBRARY_WORKER_KEY=$key`n"
  [IO.File]::WriteAllText($path,$text)
 }
 if($key -notmatch '^[a-f0-9]{64}$'){throw 'La clave configurada debe tener 64 caracteres hexadecimales'}
 docker cp integrations/n8n/install-hybrid-runtime.cjs ceroa-n8n:/tmp/ceroa-install-hybrid.cjs
 if($LASTEXITCODE -ne 0){throw 'No se pudo copiar el instalador'}
 @{workerKey=$key}|ConvertTo-Json -Compress|docker exec -i ceroa-n8n node /tmp/ceroa-install-hybrid.cjs
 if($LASTEXITCODE -ne 0){throw 'No se pudieron preparar las credenciales'}
 docker exec ceroa-n8n n8n import:credentials --input=/tmp/ceroa-hybrid-credentials.json
 if($LASTEXITCODE -ne 0){throw 'No se pudo importar la credencial cifrada'}
 foreach($workflow in @('hybrid-rag-ingestion','hybrid-rag-sync','hybrid-rag-query','hybrid-rag-ocr')){
  docker exec ceroa-n8n n8n import:workflow --input=/tmp/ceroa-$workflow-installed.json
  if($LASTEXITCODE -ne 0){throw 'No se pudo importar un workflow'}
 }
 Write-Output 'Workflows híbridos instalados, sin activarlos ni cambiar el asistente actual.'
}finally{Pop-Location}
