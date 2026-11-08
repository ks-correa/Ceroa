$ErrorActionPreference='Stop'
$workspace=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$fixture=Join-Path $workspace 'tmp/n8n-workspace-runtime'
node (Join-Path $PSScriptRoot 'workspace-runtime-fixture.mjs') $fixture
Copy-Item (Join-Path $PSScriptRoot 'workspace-provider-stub.cjs') (Join-Path $fixture 'provider.cjs')
Copy-Item (Join-Path $PSScriptRoot 'check-workspace-runtime.cjs') (Join-Path $fixture 'check.cjs')
Copy-Item (Join-Path $PSScriptRoot 'test-workspace-runtime.sh') (Join-Path $fixture 'run.sh')
$image=(& docker inspect ceroa-n8n --format '{{.Image}}').Trim()
if($LASTEXITCODE -ne 0){throw 'Cannot identify installed n8n image'}
& docker run --rm --network none --entrypoint /bin/sh -e N8N_DIAGNOSTICS_ENABLED=false -v "${fixture}:/fixtures:ro" $image /fixtures/run.sh
if($LASTEXITCODE -ne 0){throw 'Native workspace fixture failed'}
