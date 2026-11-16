param(
 [string]$Image='sha256:ffeb52485f78b1b06c9a832205853cf75da72a07a514c9a27724df85979d6c34',
 [string]$OutputDirectory='tmp/verification/ceroa-recovery-2026-11-14'
)
$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$fixtures=Join-Path $root ('tmp/ceroa-native-'+[Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force $fixtures | Out-Null
New-Item -ItemType Directory -Force $OutputDirectory | Out-Null
$output=(Resolve-Path $OutputDirectory).Path
node (Join-Path $root 'integrations/n8n/multiagent-runtime-fixture.mjs') $fixtures
if($LASTEXITCODE -ne 0){throw 'Synthetic fixture generation failed'}
foreach($pair in @(@('multiagent-provider-stub.cjs','provider.cjs'),@('check-multiagent-runtime.cjs','check.cjs'))){Copy-Item -LiteralPath (Join-Path $root ('integrations/n8n/'+$pair[0])) -Destination (Join-Path $fixtures $pair[1])}
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'ceroa-native-trace.cjs') -Destination (Join-Path $fixtures 'trace.cjs')
$wait=[IO.File]::ReadAllText((Join-Path $root 'integrations/n8n/wait-document-runtime.cjs')).Replace('ceroaFixtureWorker22','ceroaKnowledgeAgent30')
[IO.File]::WriteAllText((Join-Path $fixtures 'wait.cjs'),$wait)
$run=[IO.File]::ReadAllText((Join-Path $root 'integrations/n8n/test-multiagent-runtime.sh')).Replace("`r",'')
$run=$run.Split(@('for scenario in COMPOSITE FINANCIAL RAG EXTRACTS; do'),[StringSplitOptions]::None)[0]
$end=$run.LastIndexOf('done')
$run=$run.Substring(0,$end)+' node /fixtures/trace.cjs "$scenario"'+"`n"+$run.Substring($end)
[IO.File]::WriteAllText((Join-Path $fixtures 'run.sh'),$run)
# All credentials are synthetic; no production volume, .env or network is mounted.
docker run --rm --pull never --network none --entrypoint /bin/sh -e N8N_DIAGNOSTICS_ENABLED=false -e N8N_VERSION_NOTIFICATIONS_ENABLED=false -v "${fixtures}:/fixtures:ro" -v "${output}:/results" $Image /fixtures/run.sh
if($LASTEXITCODE -ne 0){throw 'Isolated native verification failed; inspect private fixture directory'}
