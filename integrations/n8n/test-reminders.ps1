# Isolated n8n acceptance test. Only a loopback fake Telegram endpoint is used.
$ErrorActionPreference='Stop'
$workspace=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Push-Location $workspace
try {
  node integrations/n8n/build-reminder-workflows.mjs
  docker cp integrations/n8n/reminders/mock-runtime.cjs ceroa-n8n:/tmp/ceroa-reminder-mock.cjs
  docker exec ceroa-n8n node /tmp/ceroa-reminder-mock.cjs prepare
  docker exec ceroa-n8n n8n import:credentials --input=/tmp/ceroa-reminder-mock-creds.json
  docker exec ceroa-n8n n8n import:workflow --input=/tmp/ceroa-reminder-mock-workflow.json
  docker exec -d ceroa-n8n node /tmp/ceroa-reminder-mock.cjs serve
  $ErrorActionPreference='Continue'
  foreach($scenario in @('success','rate-limit','server-error','permanent','timeout','result-retry','revoked')){
    docker exec ceroa-n8n node /tmp/ceroa-reminder-mock.cjs scenario $scenario
    docker exec -e N8N_RUNNERS_BROKER_PORT=5681 ceroa-n8n n8n execute --id=ceroaReminderMock04 > (Join-Path $env:TEMP "ceroa-reminder-mock-$scenario.log") 2>&1
    if($LASTEXITCODE -ne 0){throw 'Falló la ejecución sintética del workflow.'}
    docker exec ceroa-n8n node /tmp/ceroa-reminder-mock.cjs check
    if($LASTEXITCODE -ne 0){throw 'Falló el contrato sintético de recordatorios.'}
  }
} finally {
  docker exec ceroa-n8n node /tmp/ceroa-reminder-mock.cjs shutdown
  Pop-Location
}
