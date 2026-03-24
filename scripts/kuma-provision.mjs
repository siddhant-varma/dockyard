#!/usr/bin/env node
/**
 * Kuma Monitor Provisioning Script
 *
 * Creates all monitors, webhook notification, and status page in Uptime Kuma
 * via the Socket.IO API. Run once to bootstrap the monitoring ecosystem.
 *
 * Usage: node scripts/kuma-provision.mjs
 *
 * Environment: Uses the deployed Kuma at kuma.dockyard.cc
 */

import { io } from "socket.io-client";

const KUMA_URL = "https://kuma.dockyard.cc";
const KUMA_USER = "kuma-admin@dockyard";
const KUMA_PASS = "DockYard-Kuma-2026!";
const DOCKYARD_URL = "https://dockyard.cc";

// ── Monitor Definitions ─────────────────────────────────────────

const MONITORS = [
  // Tier 1 — Core
  {
    name: "DockYard — App",
    type: "keyword",
    url: `${DOCKYARD_URL}/api/health`,
    keyword: '"status":"ok"',
    method: "GET",
    interval: 30,
    maxretries: 3,
    retryInterval: 10,
    accepted_statuscodes: ["200-299"],
    tags: ["tier-1", "dockyard-project:dockyard"],
  },
  {
    name: "DockYard — PostgreSQL",
    type: "port",
    hostname: "dockyard-postgres",
    port: 5432,
    interval: 30,
    maxretries: 3,
    tags: ["tier-1", "dockyard-project:dockyard"],
  },
  {
    name: "DockYard — Deep Health",
    type: "keyword",
    url: `${DOCKYARD_URL}/api/health/deep`,
    keyword: '"status"',
    method: "GET",
    interval: 60,
    maxretries: 2,
    accepted_statuscodes: ["200-299"],
    tags: ["tier-1", "dockyard-project:dockyard"],
  },

  // Tier 1b — Per-Dependency Deep Health (via ?check= filter)
  {
    name: "DockYard — Postgres Health",
    type: "keyword",
    url: `${DOCKYARD_URL}/api/health/deep?check=postgres`,
    keyword: '"status":"ok"',
    method: "GET",
    interval: 60,
    maxretries: 2,
    accepted_statuscodes: ["200-299"],
    tags: ["deep-health", "dockyard-project:dockyard"],
  },
  {
    name: "DockYard — TimescaleDB Health",
    type: "keyword",
    url: `${DOCKYARD_URL}/api/health/deep?check=timescaledb`,
    keyword: '"status":"ok"',
    method: "GET",
    interval: 120,
    maxretries: 2,
    accepted_statuscodes: ["200-299"],
    tags: ["deep-health", "dockyard-project:dockyard"],
  },
  {
    name: "DockYard — Dokploy Auth",
    type: "keyword",
    url: `${DOCKYARD_URL}/api/health/deep?check=dokploy`,
    keyword: '"status":"ok"',
    method: "GET",
    interval: 120,
    maxretries: 2,
    accepted_statuscodes: ["200-299"],
    tags: ["deep-health", "dockyard-project:dockyard"],
  },
  {
    name: "DockYard — Hetzner Auth",
    type: "keyword",
    url: `${DOCKYARD_URL}/api/health/deep?check=hetzner`,
    keyword: '"status":"ok"',
    method: "GET",
    interval: 120,
    maxretries: 2,
    accepted_statuscodes: ["200-299"],
    tags: ["deep-health", "dockyard-project:dockyard"],
  },
  {
    name: "DockYard — Kuma Reachable",
    type: "keyword",
    url: `${DOCKYARD_URL}/api/health/deep?check=kuma`,
    keyword: '"status":"ok"',
    method: "GET",
    interval: 120,
    maxretries: 2,
    accepted_statuscodes: ["200-299"],
    tags: ["deep-health", "dockyard-project:dockyard"],
  },
  {
    name: "DockYard — GitHub API",
    type: "keyword",
    url: `${DOCKYARD_URL}/api/health/deep?check=github-api`,
    keyword: '"status":"ok"',
    method: "GET",
    interval: 300,
    maxretries: 2,
    accepted_statuscodes: ["200-299"],
    tags: ["deep-health", "dockyard-project:dockyard"],
  },
  {
    name: "DockYard — Encryption",
    type: "keyword",
    url: `${DOCKYARD_URL}/api/health/deep?check=encryption`,
    keyword: '"status":"ok"',
    method: "GET",
    interval: 300,
    maxretries: 2,
    accepted_statuscodes: ["200-299"],
    tags: ["deep-health", "dockyard-project:dockyard"],
  },

  // Tier 2 — External Dependencies
  {
    name: "Dokploy API",
    type: "http",
    url: "https://dokploy.dockyard.cc",
    method: "GET",
    interval: 60,
    maxretries: 2,
    accepted_statuscodes: ["200-299", "300-399", "401-499"],
    tags: ["tier-2"],
  },
  {
    name: "Hetzner Cloud API",
    type: "http",
    url: "https://api.hetzner.cloud/v1/datacenters",
    method: "GET",
    interval: 120,
    maxretries: 2,
    accepted_statuscodes: ["200-299"],
    tags: ["tier-2"],
  },
  {
    name: "GitHub API",
    type: "http",
    url: "https://api.github.com/rate_limit",
    method: "GET",
    interval: 120,
    maxretries: 2,
    accepted_statuscodes: ["200-299"],
    tags: ["tier-2"],
  },

  // Tier 3 — Background Infrastructure
  {
    name: "DockYard — Self-Push",
    type: "push",
    interval: 120,
    maxretries: 0,
    tags: ["tier-3", "dockyard-project:dockyard"],
  },
  {
    name: "DockYard — SSE Endpoint",
    type: "http",
    url: `${DOCKYARD_URL}/api/sse`,
    method: "GET",
    interval: 60,
    maxretries: 2,
    accepted_statuscodes: ["200-299"],
    tags: ["tier-3", "dockyard-project:dockyard"],
  },
];

// ── Helpers ─────────────────────────────────────────────────────

function connect() {
  return new Promise((resolve, reject) => {
    const socket = io(KUMA_URL, { transports: ["websocket"] });
    socket.on("connect", () => {
      socket.emit("login", { username: KUMA_USER, password: KUMA_PASS, token: "" }, (res) => {
        if (res.ok) {
          console.log("✓ Authenticated with Kuma");
          resolve(socket);
        } else {
          reject(new Error(`Login failed: ${JSON.stringify(res)}`));
        }
      });
    });
    socket.on("connect_error", (err) => reject(err));
    setTimeout(() => reject(new Error("Connection timeout")), 10000);
  });
}

function emit(socket, event, data) {
  return new Promise((resolve, reject) => {
    socket.emit(event, data, (res) => {
      if (res.ok === false && res.msg) reject(new Error(res.msg));
      else resolve(res);
    });
    setTimeout(() => reject(new Error(`${event} timeout`)), 15000);
  });
}

function getMonitorList(socket) {
  return new Promise((resolve) => {
    socket.emit("getMonitorList", (res) => resolve(res));
    setTimeout(() => resolve({}), 5000);
  });
}

// ── Tags ────────────────────────────────────────────────────────

async function ensureTags(socket) {
  const tagNames = ["tier-1", "tier-2", "tier-3", "tier-4", "tier-5", "deep-health", "dockyard-project:dockyard"];

  // Get existing tags
  let existingTags = [];
  try {
    const res = await emit(socket, "getTags", null);
    existingTags = res || [];
    if (Array.isArray(existingTags)) {
      console.log(`  Found ${existingTags.length} existing tags`);
    }
  } catch {
    console.log("  Could not fetch tags, will create as needed");
  }

  const tagMap = new Map();

  for (const tagSpec of tagNames) {
    const [name, value] = tagSpec.includes(":") ? tagSpec.split(":") : [tagSpec, ""];
    const existing = Array.isArray(existingTags)
      ? existingTags.find((t) => t.name === name)
      : null;

    if (existing) {
      tagMap.set(tagSpec, existing);
      console.log(`  ✓ Tag "${name}" exists (id: ${existing.id})`);
    } else {
      try {
        const res = await emit(socket, "addTag", { tag: { name, color: "#059669" } });
        const newTag = res.tag || res;
        tagMap.set(tagSpec, newTag);
        console.log(`  + Created tag "${name}" (id: ${newTag.id})`);
      } catch (err) {
        console.log(`  ✗ Failed to create tag "${name}": ${err.message}`);
      }
    }
  }

  return tagMap;
}

// ── Monitor Creation ────────────────────────────────────────────

async function createMonitors(socket, tagMap) {
  const existing = await getMonitorList(socket);
  const existingNames = new Set(Object.values(existing).map((m) => m.name));

  const created = [];
  const skipped = [];
  const failed = [];

  for (const def of MONITORS) {
    if (existingNames.has(def.name)) {
      skipped.push(def.name);
      console.log(`  ~ Skipped "${def.name}" (already exists)`);
      continue;
    }

    const tags = (def.tags || []);
    delete def.tags;

    const monitorData = {
      ...def,
      notificationIDList: {},
      accepted_statuscodes: def.accepted_statuscodes || ["200-299"],
    };

    try {
      const res = await emit(socket, "add", monitorData);
      const monitorId = res.monitorID || res.id;
      console.log(`  + Created "${def.name}" (id: ${monitorId})`);

      // Add tags to monitor
      for (const tagSpec of tags) {
        const tag = tagMap.get(tagSpec);
        if (tag) {
          const [, value] = tagSpec.includes(":") ? tagSpec.split(":") : [tagSpec, ""];
          try {
            await emit(socket, "addMonitorTag", {
              tag_id: tag.id,
              monitor_id: monitorId,
              value: value || "",
            });
          } catch {
            // Tags might fail silently, that's ok
          }
        }
      }

      created.push({ name: def.name, id: monitorId });
    } catch (err) {
      failed.push({ name: def.name, error: err.message });
      console.log(`  ✗ Failed "${def.name}": ${err.message}`);
    }
  }

  return { created, skipped, failed };
}

// ── Webhook Notification ────────────────────────────────────────

async function createWebhookNotification(socket) {
  const secret = "kuma-webhook-" + Math.random().toString(36).slice(2, 14);

  try {
    const res = await emit(socket, "addNotification", {
      name: "DockYard Ingest",
      type: "webhook",
      isDefault: true,
      applyExisting: true,
      webhookContentType: "json",
      webhookURL: `${DOCKYARD_URL}/api/ingest/kuma`,
      webhookAdditionalHeaders: JSON.stringify({
        Authorization: `Bearer ${secret}`,
      }),
    });

    console.log(`✓ Webhook notification created (id: ${res.id})`);
    console.log(`  Secret: ${secret}`);
    console.log(`  → Set KUMA_WEBHOOK_SECRET=${secret} in DockYard env`);
    return { id: res.id, secret };
  } catch (err) {
    console.log(`✗ Webhook notification failed: ${err.message}`);
    return null;
  }
}

// ── Status Page ─────────────────────────────────────────────────

async function createStatusPage(socket) {
  try {
    const res = await emit(socket, "addStatusPage", {
      title: "DockYard Status",
      slug: "dockyard",
    });
    console.log(`✓ Status page created: /status/dockyard`);
    return res;
  } catch (err) {
    if (err.message.includes("already exist") || err.message.includes("unique")) {
      console.log("~ Status page 'dockyard' already exists");
      return { ok: true };
    }
    console.log(`✗ Status page failed: ${err.message}`);
    return null;
  }
}

// ── Main ────────────────────────────────────────────────────────

async function main() {
  console.log("═══ Kuma Monitor Provisioning ═══\n");

  const socket = await connect();

  console.log("\n── Creating tags ──");
  const tagMap = await ensureTags(socket);

  console.log("\n── Creating monitors ──");
  const result = await createMonitors(socket, tagMap);

  console.log("\n── Creating webhook notification ──");
  const webhook = await createWebhookNotification(socket);

  console.log("\n── Creating status page ──");
  await createStatusPage(socket);

  // Summary
  console.log("\n═══ Summary ═══");
  console.log(`  Created: ${result.created.length} monitors`);
  console.log(`  Skipped: ${result.skipped.length} (already exist)`);
  console.log(`  Failed:  ${result.failed.length}`);

  if (result.failed.length > 0) {
    console.log("\n  Failed monitors:");
    for (const f of result.failed) {
      console.log(`    - ${f.name}: ${f.error}`);
    }
  }

  if (webhook) {
    console.log(`\n  Webhook secret: ${webhook.secret}`);
    console.log("  → Set KUMA_WEBHOOK_SECRET in Dokploy env vars for DockYard");
  }

  // Get push monitor token for DockYard self-health
  const monitors = await getMonitorList(socket);
  const pushMonitor = Object.values(monitors).find((m) => m.type === "push" && m.name.includes("Self-Push"));
  if (pushMonitor) {
    console.log(`\n  Push monitor token: ${pushMonitor.pushToken}`);
    console.log("  → Set KUMA_PUSH_TOKEN in Dokploy env vars for DockYard");
  }

  // Verify metrics
  console.log("\n── Verifying /metrics ──");
  const metricsRes = await fetch(`${KUMA_URL}/metrics`, {
    headers: { Authorization: "Basic " + Buffer.from(`:uk1_y6FZTVCQkh_J0293fW6vbBKY9FN-yOCpydx8PzjE`).toString("base64") },
  });
  const metricsText = await metricsRes.text();
  const monitorCount = (metricsText.match(/^monitor_status\{/gm) || []).length;
  console.log(`  Prometheus reports ${monitorCount} monitors`);

  socket.disconnect();
  console.log("\n✓ Done");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
