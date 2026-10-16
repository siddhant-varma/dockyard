#!/bin/sh
# DockYard production startup script.
# Pushes DB schema (non-destructive) then starts the Next.js server.
# This ensures all tables exist on every deploy — safe for fresh installs,
# forks, and schema updates.
#
# A failed schema push does not stop the server (the previous schema may still
# work), but it writes MIGRATION_FAILED_MARKER, which the compose healthcheck
# treats as unhealthy so the failure is visible instead of a log line.

set -e

MIGRATION_FAILED_MARKER=/tmp/dockyard-migration-failed
rm -f "$MIGRATION_FAILED_MARKER"

migration_failed() {
  echo "[dockyard] ERROR: Schema push failed ($1); container will report unhealthy"
  touch "$MIGRATION_FAILED_MARKER"
}

echo "[dockyard] Pushing database schema..."

# Try multiple paths: npx (if in PATH), direct bin, node direct
if command -v drizzle-kit >/dev/null 2>&1; then
  drizzle-kit push --force 2>&1 || migration_failed "drizzle-kit in PATH"
elif [ -f ./node_modules/.bin/drizzle-kit ]; then
  ./node_modules/.bin/drizzle-kit push --force 2>&1 || migration_failed ".bin"
elif [ -d ./node_modules/drizzle-kit ]; then
  node ./node_modules/drizzle-kit/bin.cjs push --force 2>&1 || migration_failed "node direct"
else
  migration_failed "drizzle-kit not found"
fi

# Self-hosted Inngest only learns about functions when the app registers
# (PUT /api/inngest). Do it once the server answers, from a URL the Inngest
# server can reach on the Docker network. Skipped without INNGEST_BASE_URL.
if [ -n "$INNGEST_BASE_URL" ]; then
  (
    register_url="${INNGEST_REGISTER_URL:-http://dockyard-app:3000/api/inngest}"
    for _ in $(seq 1 30); do
      sleep 2
      wget -qO- "http://127.0.0.1:${PORT:-3000}/api/health" >/dev/null 2>&1 || continue
      # busybox wget has no PUT, so use Node's fetch.
      if node -e "fetch(process.argv[1],{method:'PUT'}).then(r=>process.exit(r.ok?0:1),()=>process.exit(1))" "$register_url"; then
        echo "[dockyard] Inngest functions registered ($register_url)"
      else
        echo "[dockyard] WARNING: Inngest registration failed ($register_url)"
      fi
      exit 0
    done
    echo "[dockyard] WARNING: server not up after 60s; Inngest not registered"
  ) &
fi

echo "[dockyard] Starting Next.js server..."
exec node server.js
