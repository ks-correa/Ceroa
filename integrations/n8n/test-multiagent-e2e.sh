#!/bin/sh
set -eu
node /fixtures/provider.cjs >/tmp/provider.log 2>&1 &
n8n import:credentials --input=/fixtures/credentials.json >/tmp/credentials.log 2>&1
n8n import:workflow --input=/fixtures/workflows.json >/tmp/import.log 2>&1
for id in ceroaFinancialAgent30 ceroaKnowledgeAgent30 ceroaSupportAgent30 ceroaHybridQuery20; do n8n publish:workflow --id="$id" >>/tmp/publish.log 2>&1; done
exec n8n start
