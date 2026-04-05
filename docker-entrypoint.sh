#!/bin/sh
set -e

if [ ! -f "/app/db/command-center.db" ]; then
  echo "No database found — copying starter database..."
  cp /app/db-seed/command-center.db /app/db/command-center.db
fi

# Start server in background so we can call the revalidation endpoint once it is up.
node server.js &
SERVER_PID=$!

# Forward Docker signals to the Node process so graceful shutdown still works.
trap 'kill -TERM $SERVER_PID' TERM INT

# Bust the Full Route Cache for pages pre-rendered at build time with seed data.
# Retry up to 30 s; the loop also acts as the readiness check.
echo "Waiting for server to start..."
i=0
while [ $i -lt 30 ]; do
  if wget -qO/dev/null --post-data='' --header="X-Revalidate-Secret: ${REVALIDATE_SECRET:-}" "http://localhost:3000/api/startup-revalidate" 2>/dev/null; then
    echo "Server ready — cache revalidated."
    break
  fi
  i=$((i+1))
  sleep 1
done

if [ $i -ge 30 ]; then
  echo "Warning: server did not respond within 30 s — skipping cache revalidation."
fi

# Wait for the server process (keeps the container running).
wait $SERVER_PID
