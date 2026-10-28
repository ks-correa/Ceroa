$ErrorActionPreference = 'Stop'
$workspace = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Push-Location $workspace
try {
  $previousPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $logs = docker logs ceroa-telegram-tunnel 2>&1 | Out-String
  $ErrorActionPreference = $previousPreference
  if ($LASTEXITCODE -ne 0) { throw 'No se pudieron leer los logs del túnel.' }
  $urls = [regex]::Matches($logs, 'https://[a-z0-9-]+\.trycloudflare\.com')
  if ($urls.Count -eq 0) { throw 'El túnel todavía no tiene una URL pública.' }
  $url = $urls[$urls.Count - 1].Value
  $path = Join-Path $workspace '.env.telegram-local'
  $text = [IO.File]::ReadAllText($path)
  if ($text -notmatch '(?m)^TELEGRAM_PUBLIC_URL=') { throw 'Falta TELEGRAM_PUBLIC_URL.' }
  Copy-Item -LiteralPath $path -Destination ($path + '.tunnel.backup') -Force
  $text = [regex]::Replace($text, '(?m)^TELEGRAM_PUBLIC_URL=[^\r\n]*', 'TELEGRAM_PUBLIC_URL=' + $url)
  [IO.File]::WriteAllText($path, $text, (New-Object Text.UTF8Encoding($false)))
  # Register first, preserving queued messages before n8n checks its trigger on restart.
  docker exec -e "N8N_WEBHOOK_URL=$url/" ceroa-n8n node /opt/ceroa-workflows/sync-telegram-webhook.cjs --apply
  if ($LASTEXITCODE -ne 0) { throw 'No se pudo sincronizar Telegram.' }
  docker compose --env-file .env --env-file .env.telegram-local -f docker-compose.yml -f docker-compose.n8n.yml -f docker-compose.n8n-sandbox.yml -f docker-compose.telegram-local.yml up -d --no-deps n8n
  if ($LASTEXITCODE -ne 0) { throw 'No se pudo actualizar la URL de n8n.' }
  Write-Output 'Telegram apunta al túnel actual. No se descartaron mensajes pendientes.'
} finally { Pop-Location }
