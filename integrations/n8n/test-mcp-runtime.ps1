$ErrorActionPreference='Stop'
$workspace=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$fixture=Join-Path $workspace 'tmp/n8n-mcp-runtime'
node (Join-Path $PSScriptRoot 'mcp-runtime-fixture.mjs') $fixture
Copy-Item (Join-Path $PSScriptRoot 'mcp-provider-stub.cjs') (Join-Path $fixture 'provider.cjs')
Copy-Item (Join-Path $PSScriptRoot 'check-mcp-runtime.cjs') (Join-Path $fixture 'check.cjs')
Copy-Item (Join-Path $PSScriptRoot 'test-mcp-runtime.sh') (Join-Path $fixture 'run.sh')
$image=(& docker inspect ceroa-n8n --format '{{.Image}}').Trim()
& docker run --rm --network none --entrypoint /bin/sh -e N8N_DIAGNOSTICS_ENABLED=false -e N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true -v "${fixture}:/fixtures:ro" $image /fixtures/run.sh
if($LASTEXITCODE -ne 0){throw 'Native MCP fixture failed'}
