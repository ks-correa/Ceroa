#!/bin/sh
set -eu

# These workflows serve the app. Administrative indexing is deliberately manual.
workflow_ids='ceroaTelegram01 ceroaDocuments02 ceroaRagIngest20 ceroaOcr21 ceroaHybridQuery20 ceroaRagSync20 ceroaRagEmbedding03 ceroaReminderError04 ceroaReminders04 ceroaSentinel05 ceroaSentinelError05'
installed="$(n8n list:workflow --onlyId)"

for workflow_id in $workflow_ids; do
  if printf '%s\n' "$installed" | grep -Fxq "$workflow_id"; then
    n8n publish:workflow --id="$workflow_id"
  fi
done

exec /docker-entrypoint.sh
