$ErrorActionPreference='Stop'
$workspace=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$image=(& docker inspect ceroa-n8n --format '{{.Image}}').Trim()
if($LASTEXITCODE -ne 0){throw 'No se pudo identificar la imagen instalada'}
foreach($scenario in @('empty','populated')){
  $fixtureDir=Join-Path $workspace ('tmp/n8n-runtime-'+[guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Path $fixtureDir | Out-Null
  node (Join-Path $PSScriptRoot 'document-runtime-fixture.mjs') (Join-Path $fixtureDir 'runtime-fixture.json') $scenario
  if($LASTEXITCODE -ne 0){throw 'No se pudo preparar el escenario'}
  Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'wait-document-runtime.cjs') -Destination (Join-Path $fixtureDir 'wait-runtime.cjs')
  Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'check-document-runtime.cjs') -Destination (Join-Path $fixtureDir 'check-runtime.cjs')
  Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'test-document-runtime.sh') -Destination (Join-Path $fixtureDir 'test-runtime.sh')
  & docker run --rm --network none --entrypoint /bin/sh -v "${fixtureDir}:/fixtures:ro" $image /fixtures/test-runtime.sh
  if($LASTEXITCODE -ne 0){throw "Falló el escenario $scenario"}
}
