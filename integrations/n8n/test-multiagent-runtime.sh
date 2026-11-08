#!/bin/sh
set -eu
node /fixtures/provider.cjs >/tmp/provider.log 2>&1 &
n8n import:credentials --input=/fixtures/credentials.json >/tmp/credentials.log 2>&1
n8n import:workflow --input=/fixtures/workflows.json >/tmp/import.log 2>&1
for id in ceroaFinancialAgent30 ceroaKnowledgeAgent30 ceroaSupportAgent30; do n8n publish:workflow --id="$id" >>/tmp/publish.log 2>&1; done
n8n start >/tmp/server.log 2>&1 &
node /fixtures/wait.cjs
for scenario in COMPOSITE FINANCIAL RAG SUPPORT UNKNOWN EXTRACTS; do
 id=ceroaMultiagentFixture30
 if [ "$scenario" != COMPOSITE ]; then id="${id}${scenario}"; fi
 N8N_RUNNERS_BROKER_PORT=5689 n8n execute --id="$id" >/tmp/execute.log 2>&1 || { tail -c 10000 /tmp/execute.log; cat /tmp/provider-error.log 2>/dev/null || true; cat /tmp/provider-traces.json; exit 1; }
 node /fixtures/check.cjs "$scenario" || { cat /tmp/provider-traces.json; tail -c 12000 /tmp/execute.log; cat /tmp/provider-error.log 2>/dev/null || true; tail -c 2000 /tmp/server.log; exit 1; }
done
for scenario in COMPOSITE FINANCIAL RAG EXTRACTS; do
 N8N_RUNNERS_BROKER_PORT=5689 n8n execute --id="ceroaLegacyFixture30${scenario}" >/tmp/execute.log 2>&1
 node /fixtures/check.cjs "$scenario" legacy
done
