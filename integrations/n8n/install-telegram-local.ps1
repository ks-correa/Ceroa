param([string]$TelegramCredentialId = '')
$ErrorActionPreference = 'Stop'
$workspace = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Push-Location $workspace
try {
  $envPath = Join-Path $workspace '.env.telegram-local'
  if (!(Test-Path -LiteralPath $envPath)) { throw 'Falta .env.telegram-local con los identificadores privados y la URL temporal.' }
  $settings = @{}
  foreach ($line in [IO.File]::ReadAllLines($envPath)) {
    if ($line -match '^([A-Z_]+)=(.*)$') { $settings[$Matches[1]] = $Matches[2] }
  }
  $ErrorActionPreference = 'Continue'
  $logs = docker logs ceroa-telegram-tunnel 2>&1 | Out-String
  $ErrorActionPreference = 'Stop'
  $urls = [regex]::Matches($logs, 'https://[a-z0-9-]+\.trycloudflare\.com')
  if ($urls.Count -eq 0) { throw 'El túnel todavía no tiene una URL HTTPS. Revisa el contenedor ceroa-telegram-tunnel.' }
  $settings['TELEGRAM_PUBLIC_URL'] = $urls[$urls.Count - 1].Value
  [IO.File]::WriteAllLines($envPath, @($settings.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }))
  node integrations/n8n/build-telegram-workflow.mjs
  if ($LASTEXITCODE -ne 0) { throw 'No se pudo generar el flujo de Telegram.' }
  $export = Join-Path $env:TEMP 'ceroa-current-assistant.json'
  docker exec ceroa-n8n n8n export:workflow --id=ceroaAssistant01 --output=/tmp/ceroa-current-assistant.json
  if ($LASTEXITCODE -ne 0) { throw 'No se pudo leer el flujo del asistente.' }
  docker cp ceroa-n8n:/tmp/ceroa-current-assistant.json $export
  $assistant = @((Get-Content -LiteralPath $export -Raw -Encoding UTF8 | ConvertFrom-Json))[0]
  $header = ($assistant.nodes | Where-Object { $_.credentials.httpHeaderAuth } | Select-Object -First 1).credentials
  if (!$header) { throw 'Falta la credencial Header Auth del asistente.' }
  $workflow = Get-Content integrations/n8n/assistant-telegram.json -Raw -Encoding UTF8 | ConvertFrom-Json
  if (!$TelegramCredentialId) {
    $lookup = @'
const fs=require('fs');const root='/usr/local/lib/node_modules/n8n/node_modules/.pnpm/';
const folder=fs.readdirSync(root).find(n=>n.startsWith('sqlite3@'));
const sqlite=require(root+folder+'/node_modules/sqlite3');const db=new sqlite.Database('/home/node/.n8n/database.sqlite');
db.all('select id from credentials_entity where type=? and name=?',['telegramApi','Ceroa Telegram'],(e,rows)=>{
 if(e||rows?.length!==1){console.log('');process.exitCode=1;}else console.log(rows[0].id);db.close();
});
'@
    $lookupFile = Join-Path $env:TEMP 'ceroa-telegram-credential-lookup.js'
    [IO.File]::WriteAllText($lookupFile,$lookup)
    docker cp $lookupFile ceroa-n8n:/tmp/ceroa-telegram-credential-lookup.js
    $TelegramCredentialId = docker exec ceroa-n8n node /tmp/ceroa-telegram-credential-lookup.js
    if ($LASTEXITCODE -ne 0 -or !$TelegramCredentialId) { throw 'Guarda una única credencial Telegram API llamada Ceroa Telegram, o indica -TelegramCredentialId.' }
  }
  foreach ($node in $workflow.nodes) {
    if ($node.type -like '*telegram*') {
      $node | Add-Member -NotePropertyName credentials -NotePropertyValue @{telegramApi=@{id=$TelegramCredentialId;name='Ceroa Telegram'}} -Force
    } elseif ($node.type -eq 'n8n-nodes-base.httpRequest') {
      $node | Add-Member -NotePropertyName credentials -NotePropertyValue $header -Force
    }
  }
  $workflow.nodes[0].id = $settings['TELEGRAM_TRIGGER_ID']
  $workflow.nodes[0].webhookId = $settings['TELEGRAM_WEBHOOK_ID']
  $installed = Join-Path $env:TEMP 'ceroa-telegram-installed.json'
  [IO.File]::WriteAllText($installed, ($workflow | ConvertTo-Json -Depth 60))
  docker cp $installed ceroa-n8n:/tmp/ceroa-telegram-installed.json
  docker exec ceroa-n8n n8n import:workflow --input=/tmp/ceroa-telegram-installed.json
  if ($LASTEXITCODE -ne 0) { throw 'No se pudo importar el flujo de Telegram.' }
  $compose = @('compose','--env-file','.env','--env-file','.env.telegram-local','-f','docker-compose.yml','-f','docker-compose.n8n.yml','-f','docker-compose.n8n-sandbox.yml','-f','docker-compose.telegram-local.yml')
  $ErrorActionPreference = 'Continue'
  & docker @compose up -d --no-deps backend frontend n8n telegram-proxy
  $ErrorActionPreference = 'Stop'
  if ($LASTEXITCODE -ne 0) { throw 'No se pudieron actualizar los contenedores.' }
  $ready = $false
  for ($attempt = 0; $attempt -lt 90; $attempt++) {
    if ((docker inspect ceroa-n8n --format '{{.State.Health.Status}}') -eq 'healthy') { $ready = $true; break }
    Start-Sleep -Seconds 1
  }
  if (!$ready) { throw 'n8n no inició correctamente. Revisa sus logs antes de publicar.' }
  docker exec ceroa-n8n n8n publish:workflow --id=ceroaTelegram01
  if ($LASTEXITCODE -ne 0) { throw 'No se pudo publicar el flujo de Telegram.' }
  docker restart ceroa-n8n
  Write-Output "URL temporal: $($settings['TELEGRAM_PUBLIC_URL'])"
  Write-Output 'Vincula tu cuenta desde Perfil > Telegram en http://localhost:3000.'
} finally { Pop-Location }
