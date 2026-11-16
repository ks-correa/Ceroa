$ErrorActionPreference = 'Stop'
$workspace = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Push-Location $workspace
try {
  $previousPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $logs = docker compose logs telegram-tunnel 2>&1 | Out-String
  $ErrorActionPreference = $previousPreference
  if ($LASTEXITCODE -ne 0) { throw 'No se pudieron leer los logs del túnel.' }
  $urls = [regex]::Matches($logs, 'https://[a-z0-9-]+\.trycloudflare\.com')
  if ($urls.Count -eq 0) { throw 'El túnel todavía no tiene una URL pública.' }
  $url = $urls[$urls.Count - 1].Value
  $path = Join-Path $workspace '.env'
  $text = [IO.File]::ReadAllText($path)
  if ($text -notmatch '(?m)^N8N_WEBHOOK_URL=') { throw 'Falta N8N_WEBHOOK_URL.' }
  Copy-Item -LiteralPath $path -Destination ($path + '.tunnel.backup') -Force
  $text = [regex]::Replace($text, '(?m)^N8N_WEBHOOK_URL=[^\r\n]*', 'N8N_WEBHOOK_URL=' + $url + '/')
  [IO.File]::WriteAllText($path, $text, (New-Object Text.UTF8Encoding($false)))
  # Register first, preserving queued messages before n8n checks its trigger on restart.
  docker compose exec -e "N8N_WEBHOOK_URL=$url/" n8n node /opt/ceroa-workflows/sync-telegram-webhook.cjs --apply
  if ($LASTEXITCODE -ne 0) { throw 'No se pudo sincronizar Telegram.' }
  $compose = @('compose','up','-d','--no-deps','n8n')
  & docker @compose
  if ($LASTEXITCODE -ne 0) { throw 'No se pudo actualizar la URL de n8n.' }
  $ready = $false
  for ($attempt = 0; $attempt -lt 90; $attempt++) {
    $id = docker compose ps -q n8n
    if ((docker inspect $id --format '{{.State.Health.Status}}') -eq 'healthy') { $ready = $true; break }
    Start-Sleep -Seconds 1
  }
  if (!$ready) { throw 'n8n no inició correctamente tras actualizar su URL.' }
  Write-Output 'Telegram apunta al túnel actual. No se descartaron mensajes pendientes.'
} finally { Pop-Location }
