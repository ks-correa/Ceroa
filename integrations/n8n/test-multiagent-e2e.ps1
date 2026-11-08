$ErrorActionPreference='Stop'
$workspace=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$fixtureDir=Join-Path $workspace 'tmp/n8n-multiagent-e2e'
New-Item -ItemType Directory -Force -Path $fixtureDir | Out-Null
node (Join-Path $PSScriptRoot 'multiagent-e2e-fixture.mjs') $fixtureDir
Copy-Item (Join-Path $PSScriptRoot 'multiagent-provider-stub.cjs') (Join-Path $fixtureDir 'provider.cjs')
Copy-Item (Join-Path $PSScriptRoot 'test-multiagent-e2e.sh') (Join-Path $fixtureDir 'run.sh')
Copy-Item (Join-Path $PSScriptRoot 'wait-document-runtime.cjs') (Join-Path $fixtureDir 'wait.cjs')
(Get-Content -Raw (Join-Path $fixtureDir 'wait.cjs')).Replace('ceroaFixtureWorker22','ceroaHybridQuery20') | Set-Content -Encoding utf8 (Join-Path $fixtureDir 'wait.cjs')
$image=(& docker inspect ceroa-n8n --format '{{.Image}}').Trim()
& docker network create --internal ceroa-multiagent-verification | Out-Null
if($LASTEXITCODE -ne 0){throw 'Cannot create isolated test network'}
try {
 & docker run -d --rm --name ceroa-multiagent-n8n --network ceroa-multiagent-verification --entrypoint /bin/sh -e N8N_DIAGNOSTICS_ENABLED=false -e N8N_VERSION_NOTIFICATIONS_ENABLED=false -v "${fixtureDir}:/fixtures:ro" $image /fixtures/run.sh | Out-Null
 if($LASTEXITCODE -ne 0){throw 'Cannot start disposable n8n'}
 & docker exec ceroa-multiagent-n8n node /fixtures/wait.cjs
 if($LASTEXITCODE -ne 0){throw 'Test n8n publication not ready'}
 & docker run --rm --name ceroa-multiagent-backend --network ceroa-multiagent-verification -e MULTIAGENT_E2E=true -v "${workspace}/backend:/app" -v 'C:/Users/User/.m2:/root/.m2' -w /app maven:3.9.11-eclipse-temurin-25 mvn -o -B '-Dtest=MultiagentEndToEndTest' test
 if($LASTEXITCODE -ne 0){throw 'Spring + native n8n verification failed'}
} finally {
 & docker stop ceroa-multiagent-n8n | Out-Null
 & docker network rm ceroa-multiagent-verification | Out-Null
}
