#!/bin/sh
# Disposable container: actual published Gemini model, synthetic HTTP evidence only.
set -eu
node /fixtures/provider.cjs >/tmp/provider.log 2>&1 &
n8n import:credentials --input=/fixtures/credentials.json >/tmp/import-credentials.log 2>&1
n8n import:workflow --input=/fixtures/workflows.json >/tmp/import.log 2>&1
for id in ceroaFinancialAgent30 ceroaKnowledgeAgent30 ceroaSupportAgent30; do n8n publish:workflow --id="$id" >>/tmp/publish.log 2>&1; done
n8n start >/tmp/server.log 2>&1 &
node /fixtures/wait.cjs
for scenario in FINANCIAL SUPPORT; do
 N8N_RUNNERS_BROKER_PORT=5689 n8n execute --id="ceroaMultiagentFixture30${scenario}" >/tmp/execute.log 2>&1 || { echo "Real provider execution failed: $scenario (private logs retained only in disposable container)"; exit 1; }
 node /fixtures/check-real.cjs "$scenario"
done
