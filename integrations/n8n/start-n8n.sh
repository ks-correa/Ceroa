#!/bin/sh
set -eu

node /opt/ceroa-workflows/bootstrap.mjs
exec /docker-entrypoint.sh
