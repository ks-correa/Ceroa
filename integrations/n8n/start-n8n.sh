#!/bin/sh
set -eu

# Publication is an explicit deployment operation. n8n restores the existing
# active versions itself; publishing here could activate an unreviewed draft.

exec /docker-entrypoint.sh
