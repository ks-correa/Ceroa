#!/bin/sh
set -eu
node /fixtures/provider.cjs >/tmp/provider.log 2>&1 &
n8n import:credentials --input=/fixtures/credentials.json >/tmp/credentials.log 2>&1
n8n import:workflow --input=/fixtures/workflows.json >/tmp/import.log 2>&1
n8n publish:workflow --id=ceroaFinancialAgent30 >/tmp/publish.log 2>&1
n8n start >/tmp/server.log 2>&1 &
node /fixtures/wait.cjs
for scenario in BADPARSE BADREF BADREQUEST; do
 N8N_RUNNERS_BROKER_PORT=5689 n8n execute --id="ceroaBlock6Error${scenario}" >"/results/${scenario}.log" 2>&1
 node /fixtures/check-errors.cjs "$scenario"
done
if N8N_RUNNERS_BROKER_PORT=5689 n8n execute --id=ceroaBlock6ErrorMULTIITEM >/results/MULTIITEM.log 2>&1; then echo 'Unexpected multiple-item acceptance';exit 1;fi
node /fixtures/check-errors.cjs MULTIITEM
