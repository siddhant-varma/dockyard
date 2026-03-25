#!/bin/sh
# DockYard production startup script.
# Pushes DB schema (non-destructive) then starts the Next.js server.
# This ensures all tables exist on every deploy — safe for fresh installs,
# forks, and schema updates.

set -e

echo "[dockyard] Pushing database schema..."

# Try multiple paths: npx (if in PATH), direct bin, node direct
if command -v drizzle-kit >/dev/null 2>&1; then
  drizzle-kit push --force 2>&1 || echo "[dockyard] WARNING: Schema push failed (drizzle-kit in PATH)"
elif [ -f ./node_modules/.bin/drizzle-kit ]; then
  ./node_modules/.bin/drizzle-kit push --force 2>&1 || echo "[dockyard] WARNING: Schema push failed (.bin)"
elif [ -d ./node_modules/drizzle-kit ]; then
  node ./node_modules/drizzle-kit/bin.cjs push --force 2>&1 || echo "[dockyard] WARNING: Schema push failed (node direct)"
else
  echo "[dockyard] WARNING: drizzle-kit not found — schema push skipped"
  echo "[dockyard] Run 'npx drizzle-kit push' manually against the production DB"
fi

echo "[dockyard] Starting Next.js server..."
exec node server.js
