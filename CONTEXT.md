# CONTEXT.md — DockYard

> Self-hosted ops platform: project discovery + health monitoring + config management.
> Open-source (MIT). Public repo. Written for external contributors — no internal jargon.

## What it is

Two major services in one Next.js 15 monolith:
- **DockYard** (Management Plane) — project discovery, tracking, config mgmt
  - dockyard.cc → Home Dashboard (VPS health, billing, alerts)
  - projects.dockyard.cc → Projects Portal (roadmap, config, public portfolio)
- **Watchtower** (Observation Plane) — health monitoring, alerting, incidents
  - watchtower.dockyard.cc → Health monitoring, test runner, incident mgmt

## Status

Phase 2 (Watchtower v2) — COMPLETE. All 20 sessions, 106 tasks done.

## Stack

Next.js 15 (React 19, App Router) · TypeScript · PostgreSQL + TimescaleDB · Drizzle ORM · Inngest (background jobs) · Tailwind CSS v4 + Tremor · Vercel AI SDK

## Dev machine: MacBook only

Repo: ~/Desktop/shadowlabs/DockYard/

```bash
npm run dev           # Next.js dev server :3000
npx inngest-cli dev   # Inngest dev server (background jobs)
npx drizzle-kit push  # Push schema to DB
```

## Deployment

Git push to main → Dokploy autodeploy on the production VPS.

## Key gotchas

- Port 3000 reserved by Dokploy — app uses 3001+; Traefik routes 80/443
- Next.js middleware handles subdomain routing (dockyard.cc / projects / watchtower)
- Inngest functions run isolated — no shared in-memory state with API routes
- Dokploy API requires v0.28.8+; v0.28.7 has broken API key schema
- withAuth() vs withAuthContext() — two separate wrappers due to Next.js App Router type strictness
- JIT re-auth timestamps in-memory (Map) — needs Redis for multi-instance

## Docs

- docs/system/Tasks.md — task tracking (ID format: P4-AUTH-001)
- ARCHITECTURE.md — full system topology
- Roadmap.md — phased rollout plan
- CLAUDE.md — full project memory for Claude Code sessions
