# CLAUDE.md — Project Memory

> **DockYard** — Open-source, modular, self-hosted operations platform organized around two services: **DockYard** (project discovery, tracking, config management) and **Watchtower** (health monitoring, alerting, incidents). Supports dual operating modes: local development (filesystem-based project discovery) and VPS/deployed (Dokploy + GitHub integration).

## Project Identity

- **License**: Open source (MIT)
- **Repository**: Public — all code, docs, and decisions are written for external consumption
- **Target users**: Indie developers and small teams running multiple projects on self-hosted VPS infrastructure

### Key USPs

1. **Open Source First** — This is a public codebase. Every module, config, and convention must be written so an external contributor can understand it without tribal knowledge. Public-facing code quality: JSDoc on all exports, meaningful variable names, no internal jargon without explanation.
2. **Modular & Ecosystem-Agnostic** — Any developer should be able to swap infrastructure providers. The Dokploy and Hetzner integrations are **adapter modules** behind clean interfaces, not hardcoded dependencies. A contributor running Coolify on DigitalOcean should be able to write their own adapter and plug in without touching core code.

### Modularity Rules

- **Discovery sources** (`src/lib/discovery/sources/`) implement a `DiscoverySource` interface. Filesystem, Dokploy, GitHub, and manual are all pluggable — contributors can add new sources (e.g., Coolify, DigitalOcean) without touching the scanner core.
- **Provider adapters** (`src/lib/dokploy/`, `src/lib/hetzner/`) must implement a shared interface defined in `src/lib/providers/types.ts`. Core code imports the interface, never the concrete adapter.
- **Notification channels** (`src/lib/notifications/`) follow the same adapter pattern — Slack, email, push, and webhook are all interchangeable implementations of a `NotificationChannel` interface.
- **DIP (DockYard Integration Protocol)** is the public contract for projects to integrate. It must be documented, versioned, and stable. Breaking changes require a major version bump.
- **Components** should be self-contained and usable outside DockYard where practical (e.g., health cards, status badges, metric sparklines could be published as an npm package later).
- **No vendor lock-in in core**: Drizzle (not Prisma — SQL-like, no proprietary query engine), Inngest (replaceable with BullMQ or similar), SSE (not a proprietary real-time service).

## Current Phase

Phase 2 — Advanced (Watchtower v2). Sessions 1-10 of 20 complete (75 of 106 tasks).
See `docs/planning/phase-2-execution-plan.md` for the full plan.
Task tracking: `docs/system/Tasks.md` — IDs use `[Phase]-[Component]-[Number]` format (e.g., `P4-AUTH-001`)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (React 19, App Router, RSC) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS v4 + Framer Motion + Tremor (charts) |
| Database | PostgreSQL + TimescaleDB (via Drizzle ORM) |
| Background Jobs | Inngest (event-driven, serverless-compatible) |
| AI Layer | Vercel AI SDK (multi-provider) |
| Auth | OAuth2 SSO (GitHub/Google) + FIDO2 MFA |
| Real-Time | Server-Sent Events (SSE) |
| Notifications | Resend (email) + Slack webhooks + Web Push API |
| Deployment | Dokploy on Hetzner VPS |
| External APIs | Dokploy API, Hetzner Cloud API, GitHub Webhooks |

## Project Structure

```
DockYard/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (home)/               # dockyard.cc — Home dashboard + settings
│   │   │   └── settings/         # Discovery config, integrations, project paths
│   │   ├── (projects)/           # projects.dockyard.cc — Projects portal
│   │   │   └── [slug]/           # Per-project views + config panel
│   │   │       ├── config/       # Project config editor
│   │   │       └── roadmap/      # Project roadmap view
│   │   ├── (watchtower)/         # watchtower.dockyard.cc — Health & ops
│   │   │   ├── [slug]/           # Per-project health + tests + logs
│   │   │   │   ├── tests/        # Per-project test suites
│   │   │   │   └── logs/         # Per-project log viewer
│   │   │   ├── alerts/           # Global alert rules & history
│   │   │   └── incidents/        # Incident timeline
│   │   └── api/                  # API routes
│   │       ├── auth/reauth/      # JIT re-authentication endpoint
│   │       ├── discovery/        # Project discovery & scan endpoints
│   │       ├── settings/         # Platform settings & integrations
│   │       ├── ingest/           # Webhook receiver (CloudEvents)
│   │       ├── dokploy/          # Dokploy API proxy
│   │       ├── hetzner/          # Hetzner API proxy
│   │       ├── projects/[slug]/  # Project CRUD, config, SLO, members, confidence, handoff, summaries
│   │       └── sse/              # SSE stream + internal broadcast endpoint
│   ├── lib/                      # Shared libraries
│   │   ├── discovery/            # Project discovery engine
│   │   │   ├── types.ts          # DiscoverySource, DiscoveredProject interfaces
│   │   │   ├── scanner.ts        # Orchestrator: runs sources, merges, deduplicates
│   │   │   └── sources/          # Pluggable discovery sources
│   │   │       ├── filesystem.ts # Local dir scanning
│   │   │       ├── dokploy.ts    # Dokploy API discovery
│   │   │       ├── github.ts     # GitHub API discovery
│   │   │       └── manual.ts     # Manual registrations
│   │   ├── providers/            # Abstract interfaces for all adapters
│   │   │   └── types.ts          # DeployProvider, InfraProvider, NotificationChannel
│   │   ├── dokploy/              # DeployProvider adapter — Dokploy API client
│   │   ├── hetzner/              # InfraProvider adapter — Hetzner Cloud API client
│   │   ├── ingestion/            # Signal normalization, validation
│   │   ├── alerts/               # Alert evaluation, deduplication, grouping, escalation, burn-rate
│   │   ├── health/               # Health check poller
│   │   ├── metrics/              # Metrics collection & aggregation
│   │   ├── slo/                  # SLO definitions, budget calculator
│   │   ├── ai/                   # Velocity, confidence scoring, summaries, context handoff
│   │   ├── auth/                 # Auth middleware, RBAC, MFA (WebAuthn/TOTP), audit logging, JIT re-auth
│   │   ├── config/               # Config service, templates, categories, rollback, presets
│   │   ├── crypto/               # Encryption/decryption for config values
│   │   ├── notifications/        # NotificationChannel adapters (email, slack, push)
│   │   └── sse/                  # SSE emitter, broadcast helper, useSSE + useRealtimeData hooks
│   ├── inngest/                  # Background job definitions
│   │   └── functions/            # Health, alerts, escalation, SLO, metrics, AI, deploy, rollback
│   ├── components/               # React components
│   │   ├── dashboard/            # Home dashboard widgets
│   │   ├── settings/             # Settings panels, discovery config, path picker
│   │   ├── projects/             # Project cards, confidence, timeline, blockers, handoff
│   │   ├── watchtower/           # Health cards, metric charts
│   │   ├── config/               # Config panel, templates, rich inputs, rollback toggle
│   │   ├── alerts/               # Alert rule builder, alert detail
│   │   ├── auth/                 # MFA enrollment, re-auth modal
│   │   └── shared/               # Status badges, sparklines, modals
│   └── db/
│       ├── schema.ts             # Drizzle schema definitions
│       └── migrations/
├── docs/                        # Git submodule → private repo (internal docs)
│   ├── CLAUDE.md                # This file — project context
│   ├── bugs.md                  # Bug tracker
│   ├── system/                  # HANDOFF, Tasks, Roadmap (internal)
│   ├── planning/                # Execution plans per phase
│   └── handover/                # Session handover notes
├── ARCHITECTURE.md              # System topology & data flows
├── COMPONENTS.md                # Service inventory & API endpoints
├── DOCKYARD-JSON.md             # .dockyard.json schema reference
├── docker-compose.yml           # TimescaleDB + local dev services
├── .env.example                 # Environment variable template
├── Roadmap.md                   # Master roadmap & system design
├── CLAUDE.md                    # Project context (standalone copy)
├── Dev-Guidelines.md            # Coding standards
└── README.md                    # Project overview & quickstart
```

## Key Commands

```bash
# Development
npm run dev                       # Next.js dev server (port 3000)
npx inngest-cli dev               # Inngest dev server (background jobs)
npx drizzle-kit push              # Push schema to DB
npx drizzle-kit generate          # Generate migration
npx drizzle-kit migrate           # Run migrations

# Build & Deploy
npm run build                     # Production build
npm run start                     # Production server

# Quality
npm run lint                      # ESLint
npx tsc --noEmit                  # Type check
```

## Code Conventions

- **File limit**: All files under 400 lines, one responsibility per file
- **TypeScript**: Strict mode, no `any` types, functional components only
- **No production pollution**: No `console.log`, mock/sample/placeholder data
- **Service layer**: Business logic in `lib/` services, NOT in API route handlers or React components
- **API routes**: Thin handlers — validate input, call service, return response. Use `withAuth()` for static routes or `withAuthContext()` for dynamic routes with params (from `@/lib/auth/guards`). Only `/api/health` is intentionally public.
- **Components**: Presentational. Data fetching via RSC or TanStack Query
- **Error handling**: Proper HTTP status codes, structured error responses at API boundaries
- **Secrets**: Never hardcoded. Always from environment variables. Encrypted at rest in `Config_Entry` table.

### Open Source Code Quality

- **JSDoc on all public exports** — Every exported function, type, and component gets a JSDoc comment explaining what it does, its params, and return value. Internal/private helpers are exempt.
- **No internal jargon** — Code comments and docs assume a reader unfamiliar with DockYard. Write "the Dokploy deploy platform API" not "Dokploy" on first reference.
- **README-driven** — Every `src/lib/*/` module gets a brief `README.md` explaining: what it does, how to swap the adapter, and how to extend it.
- **Adapter interface compliance** — New provider adapters must implement the interface from `src/lib/providers/types.ts` and pass the shared adapter test suite.
- **CONTRIBUTING.md** — Maintained at root with setup instructions, architecture overview, and how to add a new adapter.
- **Changesets** — Use changesets for versioning public-facing changes (DIP protocol, provider interfaces, component API).

## Architecture Patterns

- **Two services**: DockYard (management: discovery, tracking, config) + Watchtower (observation: health, alerts, incidents)
- **Dual operating modes**: Local dev (filesystem discovery, localhost health checks) vs. VPS/deployed (Dokploy + GitHub integration)
- **Project discovery**: Pluggable `DiscoverySource` interface — filesystem scanner, Dokploy API, GitHub API, manual. Core scanner orchestrates and deduplicates.
- **Subdomains**: `dockyard.cc` (home + settings), `projects.dockyard.cc` (projects), `watchtower.dockyard.cc` (health)
- **Route groups**: `(home)`, `(projects)`, `(watchtower)` map to subdomains via Next.js middleware
- **Navigation**: Topbar (service switcher) → SubNav (horizontal sub-tabs per route group) → Content. No sidebar.
- **Real-time**: SSE for live dashboard updates (health, deploy status, alerts). Live wrapper components merge RSC initial data with SSE-triggered refetches via `useRealtimeData` hook.
- **Background jobs**: Inngest for all async work — health polling, alert evaluation/escalation, SLO budget calculation, confidence scoring, AI summaries, metrics collection, project scanning, auto-rollback
- **Project-scoped permissions**: `requireProjectPermission(userId, slug, action)` from `src/lib/auth/permissions.ts` for project-level RBAC. Actions: read, config.write, deploy, alert.manage, test.run. Superadmins bypass all checks.
- **Audit logging**: All mutations call `logAudit()` from `src/lib/auth/audit.ts`. Append-only audit_logs table.
- **JIT re-auth**: Destructive actions check `requireReAuth()` — users must verify via FIDO2/TOTP within a 5-minute window.
- **External API proxying**: All Dokploy/Hetzner calls go through DockYard API routes, never from frontend
- **Config management**: Env var changes go through DockYard → Dokploy API → Redeploy flow (VPS mode only)
- **Event ingestion**: CloudEvents spec for all incoming events (webhooks, health checks, metrics)
- **DIP (DockYard Integration Protocol)**: 4-level progressive protocol for project-to-DockYard communication

## Database Conventions

- ORM: Drizzle (TypeScript-native, SQL-like API)
- Schema in `src/db/schema.ts`, one export per table
- Migrations via `drizzle-kit` — NEVER edit DB directly
- TimescaleDB hypertables for time-series data (Health_Check_Result, Metric_Point, Hetzner_Snapshot)
- Config values encrypted with AES-256-GCM before storage
- Audit logs are append-only — never update or delete

## Known Gotchas

- Hetzner Cloud API doesn't expose a direct billing endpoint — must calculate from resources + pricing API
- Dokploy env updates require sending the FULL env string, not individual key-value pairs
- Dokploy redeploy after env change is a separate API call (saveEnvironment then redeploy)
- TimescaleDB extension must be enabled on the Postgres instance before creating hypertables
- Next.js middleware for subdomain routing must handle both production domains and localhost dev
- Inngest functions run in a separate execution context — don't share in-memory state with API routes
- Dokploy API key generation requires `metadata: {"organizationId": "..."}` — without it, key verification fails
- Dokploy v0.28.7 has a broken API key schema — must use v0.28.8+
- Docker Compose services must use `projectname-servicename` naming (e.g., `dockyard-postgres`) to avoid collisions on shared VPS
- Port 3000 is reserved by Dokploy — use 3001+ for app services; Traefik handles routing from 80/443
- SSE broadcast from Inngest uses an internal HTTP endpoint (`/api/sse/broadcast`) since Inngest can't share in-memory state. Requires `SSE_BROADCAST_SECRET` env var in production for auth.
- React 19 strict mode: `useRef()` requires explicit initial value; `useSyncExternalStore` instead of `useState` in effects for connection status
- Next.js App Router type-checks route handler signatures strictly — `withAuth()` (static routes) and `withAuthContext()` (dynamic routes with params) are separate wrappers because optional context breaks the generated types
- GitHub webhook signature verification: when `GITHUB_WEBHOOK_SECRET` is set, the `X-Hub-Signature-256` header is mandatory — requests without it are rejected with 401
- `@simplewebauthn/server` is pinned to v9.0.3 (required by `@auth/core`) — v10+ has different API (uses `credential` object instead of `credentialID`/`credentialPublicKey`)
- JIT re-auth timestamps are stored in-memory (`Map`) — in a multi-instance deployment, this needs to be replaced with Redis or a shared cache
- Auto-rollback is disabled after 1 rollback per deployment to prevent infinite loops — 10-minute cooldown between rollback attempts
- SLO burn-rate thresholds follow Google's multi-window standard: >14.4x = SEV1, >6x = SEV2, >3x = SEV3

## Git Policy

- **NEVER** commit directly to main
- **NEVER** make a git commit unless explicitly asked by the user
- Always create feature branches
- Commit messages: `type(scope): description` — e.g., `feat(watchtower): add health check poller`

## Key Documentation

| Document | Path | Purpose |
|----------|------|---------|
| Roadmap | `Roadmap.md` | Master roadmap, system design, API specs, schema, phased rollout |
| Architecture | `ARCHITECTURE.md` | System topology, data flows |
| Components | `COMPONENTS.md` | Component inventory + API endpoints |
| DockYard JSON | `DOCKYARD-JSON.md` | .dockyard.json schema reference |
| Tasks | `docs/system/Tasks.md` | Task tracker with IDs and estimates (private submodule) |
| Handoff | `docs/system/HANDOFF.md` | Latest session handoff (private submodule) |
| Dev Guidelines | `Dev-Guidelines.md` | Coding standards, pre-commit checklist |
| Bug Tracker | `docs/bugs.md` | Bug tracker (private submodule) |
