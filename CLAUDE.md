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

Phase 2 — Advanced (Watchtower v2) — **complete**. All 20 sessions, 106 tasks implemented.
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
| Logging | Pino (structured JSON) |
| Testing | Vitest (unit/integration) + Playwright (E2E) |
| CI/CD | GitHub Actions (.github/workflows/test.yml) |
| Deployment | Dokploy on Hetzner VPS |
| External APIs | Dokploy API, Hetzner Cloud API, GitHub Webhooks |

## Project Structure

```
DockYard/
├── src/
│   ├── app/                      # Next.js App Router (flat routes, no route groups)
│   │   ├── page.tsx              # Home dashboard
│   │   ├── settings/             # Settings (7-tab panel, standalone page)
│   │   ├── self-health/          # DockYard self-monitoring
│   │   ├── projects/             # Projects grid
│   │   │   └── [slug]/           # Per-project views (7 sub-tabs)
│   │   │       ├── roadmap/      # Phase roadmap
│   │   │       ├── config/       # Env var editor
│   │   │       ├── members/      # Team members
│   │   │       ├── slo/          # SLO budgets
│   │   │       ├── insights/     # AI summaries
│   │   │       └── settings/     # Project DIP + notifications
│   │   ├── watchtower/           # Health overview
│   │   │   ├── [slug]/           # Per-project health detail (5 sub-tabs)
│   │   │   │   ├── deployments/  # Deploy history
│   │   │   │   ├── logs/         # Log viewer
│   │   │   │   ├── tests/        # Test suites
│   │   │   │   └── dora/         # DORA metrics
│   │   │   ├── alerts/           # Alert rules + firing events
│   │   │   └── incidents/        # Incident list + detail
│   │   │       └── [id]/         # Incident timeline
│   │   ├── login/                # Login page (Credentials + GitHub OAuth)
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
│   │   ├── logger/               # Pino structured logging: context, middleware, Drizzle, Inngest, sampling
│   │   └── sse/                  # SSE emitter, broadcast helper, useSSE + useRealtimeData hooks
│   ├── inngest/                  # Background job definitions
│   │   └── functions/            # Health, alerts, escalation, SLO, metrics, AI, deploy, rollback
│   ├── components/               # React components
│   │   ├── ui/                   # shadcn/ui primitives (button, badge, card, tabs, etc.)
│   │   ├── layout/               # Layout shell: header-bar, sidebar, footer, page-tabs, skeleton, motion
│   │   ├── dashboard/            # Home: alerts-strip, server-status, billing, metrics-grid, logstream, traffic, quick-actions, restart-button
│   │   ├── projects/             # Project cards, phase-timeline, confidence, blockers, activity-feed, context-handoff
│   │   ├── watchtower/           # Health cards, alert-actions, create-rule-form, create-incident-form, postmortem-section, health-sparklines
│   │   ├── settings/             # Settings tabs: general, projects, sources, notifications, ai, mfa, audit
│   │   ├── auth/                 # reauth-modal, session-provider, session-timeout-provider, session-timeout-modal
│   │   └── shared/               # EmptyState, reusable utilities
│   └── db/
│       ├── schema.ts             # Drizzle schema definitions
│       └── migrations/
├── test/                        # Test infrastructure
│   ├── setup.ts                 # Vitest setup file
│   └── helpers/fixtures.ts      # Shared test fixtures
├── e2e/                         # Playwright E2E tests
│   ├── dashboard.spec.ts        # Dashboard page tests
│   ├── projects.spec.ts         # Projects page tests
│   ├── watchtower.spec.ts       # Watchtower page tests
│   ├── settings.spec.ts         # Settings page tests
│   └── navigation.spec.ts       # Navigation flow tests
├── .github/
│   └── workflows/test.yml       # CI pipeline: static analysis, unit tests, E2E tests
├── vitest.config.ts             # Vitest configuration
├── playwright.config.ts         # Playwright configuration
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

# Testing
npx vitest run                    # Run all unit + integration tests
npx vitest run --reporter=verbose # Verbose test output
npx playwright test               # Run E2E tests (requires DOCKYARD_DEMO=true)
npx playwright test --ui          # Playwright interactive UI mode
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
- **Layout shell**: Header bar (top, brand + external links) + Sidebar (left, nav + user) + Canvas (max 1280px, centered within 1600px frame)
- **Navigation**: Sidebar (Home/Projects/Watchtower/Settings) → PageTabs (per-section horizontal tabs) → Content. Mobile: sidebar becomes bottom tab bar.
- **Flat routes**: `/`, `/projects`, `/watchtower`, `/settings`, `/self-health` — no route groups or subdomain routing in current build.
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
- `DOCKYARD_DEMO=true` in `.env` enables demo mode — all pages render with static data from `src/lib/demo-data.ts`, no DB/backend needed for frontend development
- `DOCKYARD_DIAGNOSTIC=true` enables diagnostic mode — pages bypass demo data and attempt real API fetches, rendering inline error cards on failure. Shows a health banner at the top. Can be used alongside `DOCKYARD_DEMO=true` to test which APIs are reachable.
- Tremor v4 is a beta (`@tremor/react ^4.0.0-beta`) — pin version, monitor for breaking changes. Used for BarChart and SparkAreaChart.
- Stitch wireframe download URLs expire — re-fetch via `list_screens` + `get_screen` MCP calls if needed. Project ID: `14178639867887286563`
- CSS grid children need `min-w-0` to prevent overflow — without it, content wider than available space pushes the grid past its container (learned from project detail 2-column layout)
- Delete `.next/` cache when adding new dependencies (especially Tremor/lodash) — stale vendor chunks cause runtime `Cannot find module` errors
- Test files (`*.test.ts`) are excluded from the main `tsconfig.json` to avoid polluting production builds — Vitest uses its own config with `@` path aliases
- ESLint rules are relaxed for test files (allow `any` types, non-null assertions) via overrides in `.eslintrc`
- `DOCKYARD_DEMO=true` is required for E2E tests — Playwright starts a dev server on port 3001 with demo mode enabled
- Port 3001 is used by Playwright's dev server to avoid conflicts with the default port 3000 dev server
- Pino logger must not be imported in client components — it's a Node.js-only dependency. Use `console` in client code if needed.
- `DOCKYARD_AUTH_ENABLED=true` gates both API routes (via `withAuth()`) and pages (via middleware cookie check). Middleware checks for `authjs.session-token` or `__Secure-authjs.session-token` cookies — missing cookie redirects to `/login`. Public paths exempt: `/login`, `/api/auth/*`, `/api/*`, static assets. Credentials provider validates `DOCKYARD_ADMIN_USER` + `DOCKYARD_ADMIN_PASSWORD` env vars (no DB user needed). `NEXT_PUBLIC_AUTH_ENABLED` exposed to client via `next.config.ts` env mapping.
- `GET /api/projects` uses raw `auth()` + `isAuthEnabled` check, NOT `withAuth()` wrapper — this is intentional so public portfolio mode works. When auth disabled, all projects visible. When auth enabled + no session, only `publicVisible=true` projects returned.
- `POST /api/projects` uses `requireAuth()` directly (not `withAuth()` wrapper) — returns anonymous superadmin when auth disabled.
- Dokploy env vars use `DOCKYARD_ADMIN_USER` / `DOCKYARD_ADMIN_PASSWORD` — NOT `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD`. Mismatched names are silently ignored.
- `DOCKYARD_MODE=server` controls discovery sources (Dokploy/GitHub), NOT demo data. `DOCKYARD_DEMO` controls demo data. These are independent env vars.
- Login page uses `window.location.href` (not `router.replace()`) after successful `signIn()` — Next.js soft navigation reuses cached RSC payload from unauthenticated state, causing "Loading" forever. Hard navigation forces full server re-render with the new session cookie.
- Client components must use `authFetch()` from `@/lib/api/auth-fetch` instead of raw `fetch()` for API calls. It intercepts 401 responses and redirects to `/login` when the session has expired. Server components (e.g., `diagnostic-banner.tsx`) should continue using raw `fetch()` since `authFetch` depends on `window.location`.
- Deep health checks (`src/lib/health/checks/`) use a registry pattern in `src/lib/health/checks/index.ts`. Add new checks by: (1) create `checks/<slug>.ts` exporting a `CheckFn`, (2) register it in `CHECK_REGISTRY` in `index.ts`. The orchestrator in `deep.ts` auto-discovers it.
- `GET /api/health/deep` supports `?check=<slug>` for per-dependency checks and `?token=<HEALTH_MONITOR_TOKEN>` for auth bypass (used by Kuma monitors). Both params can be combined: `?check=postgres&token=<secret>`.
- Uptime Kuma v1 uses HTTP Basic Auth for `/metrics` (empty username, API key as password) — NOT Bearer token. The settings route at `src/app/api/settings/kuma/route.ts` handles this.
- Kuma v1 CRUD API is Socket.IO only — `KumaClient` REST methods are placeholders. Use `scripts/kuma-provision.mjs` for programmatic monitor creation until Socket.IO rewrite is done.
- Kuma admin credentials: username `kuma-admin@dockyard`, password `DockYard-Kuma-2026!`. Password was reset via SQLite during KUMA-OPS provisioning.
- `HEALTH_MONITOR_TOKEN` env var enables external monitors (Kuma) to access `/api/health/deep` without session auth. If not set, token bypass is disabled and only session auth works.
- JWT sessions enforce dual timeout: idle (default 30 min, `DOCKYARD_SESSION_IDLE_TIMEOUT`) and absolute (default 8h, `DOCKYARD_SESSION_ABSOLUTE_TIMEOUT`). Timeout logic lives in the `jwt` callback in `src/lib/auth/config.ts` — `issuedAt` and `lastActivity` claims are checked on every request. When expired, `token.expired = true` and `requireAuth()` throws 401.
- `authFetch()` detects session expiry from the 401 response body and redirects to `/login?reason=timeout` or `/login?reason=revoked`. The login page reads `?reason=` to show context-appropriate messages (amber for timeout, red for revocation).
- `react-idle-timer` (v5.7) is used for client-side idle detection. The `SessionTimeoutProvider` wraps the app in `layout.tsx` and shows a 5-minute warning modal before auto-logout. It uses Web Workers for timers (avoids browser background tab throttling) and cross-tab sync via BroadcastChannel.
- **NEVER wrap `handlers.POST` from Auth.js** in a custom function. Auth.js needs full control of the Response + Set-Cookie headers. Wrapping can silently break cookie persistence. Export `{ GET, POST } = handlers` directly. Rate limiting belongs in `authorize()` or middleware, not in the route handler.
- **Schema migrations must run automatically on every deploy.** The `scripts/start.sh` startup script runs `drizzle-kit push --force` before `node server.js`. If new tables are added to `src/db/schema.ts`, they are created on next deploy. The deep health check at `?check=schema` verifies all expected tables exist.
- **All DB-touching code in the JWT callback must be wrapped in try/catch.** The `jwt` callback runs on EVERY request. If it throws (e.g., missing table), Auth.js invalidates the session → login loop. `isSessionRevoked()` catches DB errors and returns `false` (fail-open).
- `revoked_sessions` table uses `text` for `userId` (not FK to `users`) because the credentials-admin has a synthetic ID (`"credentials-admin"`) that doesn't exist in the users table. A wildcard `userId = "*"` means all sessions are revoked.
- Session revocation check in the `jwt` callback uses an in-memory cache with 30s TTL (`src/lib/auth/session-revocation.ts`) to avoid hitting the DB on every request. After force-logout, there's up to a 30-second delay before affected sessions are actually invalidated.
- HSTS and CSP headers are only added when `DOCKYARD_AUTH_ENABLED=true` (i.e., production). CSP includes `worker-src 'self' blob:` for react-idle-timer's Web Worker. Local dev (HTTP) does not get HSTS to avoid breaking localhost.
- Failed login attempts are logged via `logAudit()` with action `auth.login_failed`. Successful logins are logged via the Auth.js `signIn` event with action `auth.login_success`. Both are non-blocking (`.catch(() => {})`).
- Kuma self-push is an Inngest cron function (`kuma-self-push`, every 2 min) that runs deep health checks and pushes aggregate status to Kuma's push monitor via `KUMA_PUSH_TOKEN`. Requires both `KUMA_URL` and `KUMA_PUSH_TOKEN` env vars — skips silently if either is missing.
- `scripts/kuma-provision.mjs` accepts `HEALTH_MONITOR_TOKEN` as env var or first CLI arg. All deep health monitor URLs use the `deepHealthUrl()` helper which appends `?token=<TOKEN>` for auth bypass. Without the token, monitors will get 401 when `DOCKYARD_AUTH_ENABLED=true`.

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
