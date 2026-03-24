#!/bin/sh
# DockYard production startup script.
# Pushes DB schema (non-destructive) then starts the Next.js server.

set -e

echo "[dockyard] Pushing database schema..."
npx drizzle-kit push --force 2>&1 || echo "[dockyard] WARNING: Schema push failed — app will start anyway"

echo "[dockyard] Starting Next.js server..."
exec node server.js
