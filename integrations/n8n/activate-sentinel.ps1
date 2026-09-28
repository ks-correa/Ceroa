$ErrorActionPreference='Stop'
$workspace=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Push-Location $workspace
try {
  $path=Join-Path $workspace '.env';$private=[IO.File]::ReadAllText($path)
  if(![regex]::IsMatch($private,'(?m)^SENTINEL_WORKER_KEY=[a-f0-9]{64}\r?$')){throw 'Primero instala el centinela para generar su credencial privada.'}
  $private=[regex]::Replace($private,'(?m)^SENTINEL_ENABLED=[^\r\n]*\r?\n?','')+"`nSENTINEL_ENABLED=true`n"
  [IO.File]::WriteAllText($path,$private)
  $compose=@('compose','--env-file','.env')
  if(Test-Path .env.telegram-local){$compose+=@('--env-file','.env.telegram-local')}
  $compose+=@('-f','docker-compose.yml','-f','docker-compose.n8n.yml','-f','docker-compose.n8n-sandbox.yml')
  if(Test-Path .env.telegram-local){$compose+=@('-f','docker-compose.telegram-local.yml')}
  $ErrorActionPreference='Continue'
  & docker @compose build backend frontend
  if($LASTEXITCODE -ne 0){throw 'No se pudieron construir los servicios.'}
  & docker @compose up -d --no-deps backend frontend
  if($LASTEXITCODE -ne 0){throw 'No se pudieron desplegar los servicios.'}
  $ready=$false
  for($i=0;$i -lt 45;$i++){
    try{Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:8080/api/v1/auth/csrf' -TimeoutSec 2 | Out-Null;$ready=$true;break}catch{Start-Sleep -Seconds 1}
  }
  if(!$ready){throw 'El backend no está disponible; no se publicará el scheduler.'}
  docker exec ceroa-n8n n8n publish:workflow --id=ceroaSentinel05
  if($LASTEXITCODE -ne 0){throw 'No se pudo publicar el scheduler.'}
  docker restart ceroa-n8n
  if($LASTEXITCODE -ne 0){throw 'No se pudo reiniciar n8n.'}
  Write-Output 'RA-N8N-005 activo. Cada cuenta debe autorizar por separado las alertas de Telegram.'
} finally {Pop-Location}
