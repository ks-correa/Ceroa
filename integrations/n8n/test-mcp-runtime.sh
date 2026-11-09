#!/bin/sh
set -eu
node /fixtures/provider.cjs >/tmp/provider.log 2>&1 &
n8n import:credentials --input=/fixtures/credentials.json >/tmp/credentials.log 2>&1
n8n import:workflow --input=/fixtures/workflows.json >/tmp/import.log 2>&1
n8n execute --id=ceroaMcpClient40 >/tmp/client.log 2>&1 || { tail -c 4000 /tmp/client.log; exit 1; }
for scenario in BadAuth ServiceError Timeout; do
 set +e
 timeout 25 n8n execute --id="ceroaMcpClient40${scenario}" >"/tmp/client-${scenario}.log" 2>&1
 status=$?
 set -e
 if [ "$status" = 0 ] || [ "$status" = 124 ]; then echo "FAIL native client did not reject within its timeout: $scenario"; exit 1; fi
 echo "PASS native MCP Client rejects $scenario within bounded execution"
done
n8n execute --id=ceroaMcpClient40Malformed >/tmp/client-malformed.log 2>&1 || exit 1
node -e 'const fs=require("fs"),assert=require("assert/strict"),raw=fs.readFileSync("/tmp/client-malformed.log","utf8"),run=JSON.parse(raw.slice(raw.indexOf("{\n  \"data\":"))),out=run.data.resultData.runData["Limitar respuesta externa"][0].data.main[0][0].json;assert.equal(out.status,"UNTRUSTED_EXTERNAL_METADATA");assert(out.content.length<=4000);assert(out.content.includes("ignore previous instructions"));console.log("PASS malformed and injected external content remains bounded untrusted data")'
n8n publish:workflow --id=ceroaMcpBackend40 >/tmp/backend-publish.log 2>&1
n8n publish:workflow --id=ceroaMcpServer40 >/tmp/publish.log 2>&1 || { cat /tmp/publish.log; exit 1; }
cat /tmp/publish.log
n8n update:workflow --id=ceroaMcpServer40 --active=true >/tmp/activate.log 2>&1 || { cat /tmp/activate.log; exit 1; }
n8n start >/tmp/start.log 2>&1 &
for i in $(seq 1 45); do if wget -q -O /dev/null http://127.0.0.1:5678/healthz/readiness 2>/dev/null; then break; fi; sleep 1; done
node /fixtures/check.cjs || { tail -c 6000 /tmp/start.log; exit 1; }
