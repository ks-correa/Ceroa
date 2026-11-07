#!/bin/sh
set -eu
n8n import:workflow --input=/fixtures/query.json >/tmp/import.log 2>&1
n8n execute --id=ceroaQueryFixture23 >/tmp/query.log 2>&1 || { tail -n 40 /tmp/query.log; exit 1; }
node /fixtures/check-query.cjs
