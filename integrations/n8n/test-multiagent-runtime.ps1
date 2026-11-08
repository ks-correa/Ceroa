$ErrorActionPreference='Stop'
$workspace=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$image=(& docker inspect ceroa-n8n --format '{{.Image}}').Trim()
if($LASTEXITCODE -ne 0){throw 'Cannot identify installed image'}
$fixtureDir=Join-Path $workspace 'tmp/n8n-multiagent-runtime'
New-Item -ItemType Directory -Force -Path $fixtureDir | Out-Null
node (Join-Path $PSScriptRoot 'multiagent-runtime-fixture.mjs') $fixtureDir
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'multiagent-provider-stub.cjs') -Destination (Join-Path $fixtureDir 'provider.cjs')
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'test-multiagent-runtime.sh') -Destination (Join-Path $fixtureDir 'run.sh')
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'check-multiagent-runtime.cjs') -Destination (Join-Path $fixtureDir 'check.cjs')
(Get-Content -Raw (Join-Path $PSScriptRoot 'wait-document-runtime.cjs')).Replace('ceroaFixtureWorker22','ceroaKnowledgeAgent30') | Set-Content -Encoding utf8 (Join-Path $fixtureDir 'wait.cjs')
& docker run --rm --network none --entrypoint /bin/sh -v "${fixtureDir}:/fixtures:ro" $image /fixtures/run.sh
if($LASTEXITCODE -ne 0){throw 'Native multiagent runtime verification failed'}
