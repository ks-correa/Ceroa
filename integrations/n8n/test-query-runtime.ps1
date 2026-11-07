$ErrorActionPreference='Stop'
$workspace=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$image=(& docker inspect ceroa-n8n --format '{{.Image}}').Trim()
if($LASTEXITCODE -ne 0){throw 'No se pudo identificar la imagen instalada'}
$fixtureDir=Join-Path $workspace ('tmp/n8n-query-'+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $fixtureDir | Out-Null
node (Join-Path $PSScriptRoot 'query-runtime-fixture.mjs') (Join-Path $fixtureDir 'query.json')
if($LASTEXITCODE -ne 0){throw 'No se pudo preparar la prueba de consulta'}
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'check-query-runtime.cjs') -Destination (Join-Path $fixtureDir 'check-query.cjs')
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'test-query-runtime.sh') -Destination (Join-Path $fixtureDir 'test-query.sh')
& docker run --rm --network none --entrypoint /bin/sh -v "${fixtureDir}:/fixtures:ro" $image /fixtures/test-query.sh
if($LASTEXITCODE -ne 0){throw 'Falló la ejecución nativa de la consulta sintética'}
