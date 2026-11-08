#!/bin/sh
set -eu
node /fixtures/provider.cjs >/tmp/provider.log 2>&1 &
n8n import:credentials --input=/fixtures/credentials.json >/tmp/credentials.log 2>&1
n8n import:workflow --input=/fixtures/workflows.json >/tmp/import.log 2>&1
n8n execute --id=ceroaMcpClient40 >/tmp/client.log 2>&1 || { tail -c 4000 /tmp/client.log; exit 1; }
n8n publish:workflow --id=ceroaMcpBackend40 >/tmp/backend-publish.log 2>&1
n8n publish:workflow --id=ceroaMcpServer40 >/tmp/publish.log 2>&1 || { cat /tmp/publish.log; exit 1; }
cat /tmp/publish.log
n8n update:workflow --id=ceroaMcpServer40 --active=true >/tmp/activate.log 2>&1 || { cat /tmp/activate.log; exit 1; }
n8n start >/tmp/start.log 2>&1 &
for i in $(seq 1 45); do if wget -q -O /dev/null http://127.0.0.1:5678/healthz/readiness 2>/dev/null; then break; fi; sleep 1; done
node /fixtures/check.cjs || { tail -c 6000 /tmp/start.log; exit 1; }
