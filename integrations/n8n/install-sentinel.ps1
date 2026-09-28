$ErrorActionPreference='Stop'
$workspace=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Push-Location $workspace
try {
  node integrations/n8n/build-sentinel-workflows.mjs
  if($LASTEXITCODE -ne 0){throw 'No se pudieron generar los workflows.'}
  $path=Join-Path $workspace '.env';$private=[IO.File]::ReadAllText($path)
  $match=[regex]::Match($private,'(?m)^SENTINEL_WORKER_KEY=([a-f0-9]{64})\r?$')
  if($match.Success){$key=$match.Groups[1].Value}else{
    $bytes=New-Object byte[] 32;$rng=[Security.Cryptography.RandomNumberGenerator]::Create();$rng.GetBytes($bytes);$rng.Dispose()
    $key=([BitConverter]::ToString($bytes)).Replace('-','').ToLowerInvariant()
    $private=[regex]::Replace($private,'(?m)^SENTINEL_WORKER_KEY=[^\r\n]*\r?\n?','')+"`nSENTINEL_WORKER_KEY=$key`n"
    [IO.File]::WriteAllText($path,$private)
  }
  docker cp integrations/n8n/sentinel/install-runtime.cjs ceroa-n8n:/tmp/ceroa-sentinel-install-runtime.cjs
  @{key=$key}|ConvertTo-Json -Compress|docker exec -i ceroa-n8n node /tmp/ceroa-sentinel-install-runtime.cjs
  if($LASTEXITCODE -ne 0){throw 'No se pudieron asociar las credenciales.'}
  docker exec ceroa-n8n n8n import:credentials --input=/tmp/ceroa-sentinel-credentials.json
  if($LASTEXITCODE -ne 0){throw 'No se pudieron importar las credenciales cifradas.'}
  foreach($name in @('scheduled-sentinel','sentinel-error')){
    docker exec ceroa-n8n n8n import:workflow --input=/tmp/ceroa-$name-installed.json
    if($LASTEXITCODE -ne 0){throw 'No se pudo importar el workflow del centinela.'}
  }
  Write-Output 'RA-N8N-005 instalado, sin publicar ni enviar. Backend debe migrarse antes de activarlo.'
} finally {Pop-Location}
