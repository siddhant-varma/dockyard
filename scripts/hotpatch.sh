#!/bin/bash
# DockYard hot-patch script.
# Builds locally, copies the .next output to the VPS container, and restarts.
# Skips full Docker rebuild — ~30 sec instead of ~4 min.
#
# Usage: ./scripts/hotpatch.sh
#
# Prerequisites:
# - SSH access to VPS (uses ~/.ssh/id_ed25519)
# - Node.js 20+ locally
# - Same DATABASE_URL accessible from container
#
# How it works:
# 1. Builds Next.js locally (uses local node_modules, fast incremental)
# 2. Tars the standalone output
# 3. Copies to VPS, extracts into the running container
# 4. Restarts the container (preserves DB, env vars, volumes)

set -euo pipefail

VPS_HOST="root@204.168.136.98"
VPS_KEY="$HOME/.ssh/id_ed25519"
CONTAINER="dockyard-app"
SSH="ssh -i $VPS_KEY $VPS_HOST"

echo "[hotpatch] Building locally..."
npm run build

echo "[hotpatch] Creating transfer archive..."
tar czf /tmp/dockyard-hotpatch.tar.gz \
  .next/standalone \
  .next/static \
  scripts/start.sh \
  drizzle.config.ts \
  src/db/schema.ts \
  src/db/connection.ts

echo "[hotpatch] Uploading to VPS (~5 MB)..."
scp -i "$VPS_KEY" /tmp/dockyard-hotpatch.tar.gz "$VPS_HOST:/tmp/"

echo "[hotpatch] Extracting into container..."
$SSH "docker cp /tmp/dockyard-hotpatch.tar.gz $CONTAINER:/tmp/ && \
  docker exec $CONTAINER sh -c 'cd /app && tar xzf /tmp/dockyard-hotpatch.tar.gz --strip-components=0 2>/dev/null; rm /tmp/dockyard-hotpatch.tar.gz'"

echo "[hotpatch] Restarting container..."
$SSH "docker restart $CONTAINER"

echo "[hotpatch] Waiting for healthy..."
sleep 5
$SSH "docker logs $CONTAINER --tail 5 2>&1"

echo ""
echo "[hotpatch] Done! Container restarted with new code."

# Cleanup
rm -f /tmp/dockyard-hotpatch.tar.gz
