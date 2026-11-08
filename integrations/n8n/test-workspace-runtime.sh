#!/bin/sh
set -eu
node /fixtures/provider.cjs >/tmp/provider.log 2>&1 &
n8n import:credentials --input=/fixtures/credentials.json >/tmp/credentials.log 2>&1
n8n import:workflow --input=/fixtures/workflows.json >/tmp/import.log 2>&1
for scenario in success ambiguous changed empty; do
 n8n execute --id="ceroaWorkspaceMailFixture40${scenario}" >/tmp/execute.log 2>&1 || { tail -c 5000 /tmp/execute.log; exit 1; }
 node /fixtures/check.cjs
done
