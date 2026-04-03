#!/bin/sh
set -e

if [ ! -f "/app/db/command-center.db" ]; then
  echo "No database found — copying starter database..."
  cp /app/db-seed/command-center.db /app/db/command-center.db
fi

exec node server.js
