param([string]$PrivateDir='tmp/n8n-block3')
$ErrorActionPreference='Stop'
$workspace=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$privatePath=(Resolve-Path (Join-Path $workspace $PrivateDir)).Path
function DockerChecked { & docker @args; if($LASTEXITCODE -ne 0){throw 'Docker failed; publication stopped'} }
Push-Location $workspace
try {
 # Prepared from the authoritative published export, not by importing all repository templates.
 DockerChecked exec ceroa-n8n n8n export:workflow --all --published --output=/tmp/ceroa-block3-check.json
 DockerChecked cp ceroa-n8n:/tmp/ceroa-block3-check.json (Join-Path $privatePath 'before-deploy.json')
 node -e "const fs=require('fs'),a=require('assert/strict');const old=JSON.parse(fs.readFileSync(process.argv[1],'utf8')),current=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));const shape=x=>x.map(w=>({id:w.id,nodes:w.nodes,connections:w.connections,settings:w.settings})).sort((a,b)=>a.id.localeCompare(b.id));a.deepEqual(shape(current),shape(old),'Published definitions changed since backup; reconcile again');" (Join-Path $privatePath 'published.json') (Join-Path $privatePath 'before-deploy.json')
 if($LASTEXITCODE -ne 0){throw 'Published state drifted after backup'}
 node (Join-Path $PSScriptRoot 'multiagent-workflows.mjs') (Join-Path $privatePath 'published.json') (Join-Path $privatePath 'deploy')
 if($LASTEXITCODE -ne 0){throw 'Cannot prepare scoped workflows'}
 DockerChecked cp (Join-Path $privatePath 'deploy') ceroa-n8n:/tmp/ceroa-block3-deploy
 # Specialists first. Exactly one existing conversational webhook is replaced last.
 foreach($id in @('ceroaFinancialAgent30','ceroaKnowledgeAgent30','ceroaSupportAgent30','ceroaHybridQuery20')){
  DockerChecked exec ceroa-n8n n8n import:workflow "--input=/tmp/ceroa-block3-deploy/$id.json"
  DockerChecked exec ceroa-n8n n8n publish:workflow "--id=$id"
 }
 DockerChecked restart ceroa-n8n
 Write-Output 'Published the existing conversational route and three specialist subworkflows. Verify server publication reconciliation before accepting deployment.'
} finally {Pop-Location}
