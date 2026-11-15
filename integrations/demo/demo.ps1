param([switch]$Stop)
$ErrorActionPreference='Stop'
$repo=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Push-Location $repo
try {
  if($Stop){docker compose -p ceroa-demo -f docker-compose.demo.yml stop}
  else {
    $demoJar = if($env:CEROA_DEMO_BACKEND_JAR){$env:CEROA_DEMO_BACKEND_JAR}else{'tmp/release-candidate/ceroa-backend-0.1.0-SNAPSHOT-rc2.jar'}
    foreach($file in @($demoJar,'tmp/functional-demo/storage-key.pem','tmp/functional-demo/truststore.p12')) {
      if(-not(Test-Path -LiteralPath $file)){throw "Falta artefacto local de demostracion: $file. Consulta docs/CEROA_DEMO_FUNCIONAL.md"}
    }
    docker compose -p ceroa-demo -f docker-compose.demo.yml up -d
  }
  if($LASTEXITCODE -ne 0){throw 'Docker Compose no pudo completar la operacion'}
} finally {Pop-Location}
