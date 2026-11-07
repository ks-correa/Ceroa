#!/bin/sh
# Run ONLY in a disposable container, with /fixtures mounted read-only.
set -eu
n8n import:workflow --input=/fixtures/runtime-fixture.json >/tmp/import.log 2>&1
n8n publish:workflow --id=ceroaFixtureWorker22 >/tmp/publish.log 2>&1
n8n start >/tmp/server.log 2>&1 &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null || true' EXIT
# Publication is reconciled by the server, not just by the CLI's legacy write.
node /fixtures/wait-runtime.cjs
N8N_RUNNERS_BROKER_PORT=5689 n8n execute --id=ceroaFixtureCaller22 >/tmp/execute.log 2>&1 || { tail -n 30 /tmp/execute.log; exit 1; }
node /fixtures/check-runtime.cjs
