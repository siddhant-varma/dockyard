# Architecture

## Overview

DockYard is a Next.js 15 monolith organized around **two major services** served via middleware-based subdomain routing:

- **DockYard** (Management Plane) — Project discovery, tracking, config management, and control
  - `dockyard.cc` → Home Dashboard (VPS health, billing, alerts, settings)
  - `projects.dockyard.cc` → Projects Portal (roadmap, config, portfolio)
- **Watchtower** (Observation Plane) — Health monitoring, alerting, incidents, and ops
  - `watchtower.dockyard.cc` → Health monitoring, tests, incidents, alert rules

## Operating Modes

DockYard runs in one of two modes depending on the deployment context. The mode determines how projects are discovered and managed.

### Local Development Mode (`localhost`)

When DockYard is installed in a local directory (e.g., `~/projects/DockYard/`), it operates as a **filesystem-aware dev dashboard**:

1. **Auto-discovery**: On startup, scans sibling directories in the parent folder for project indicators:
   - Package manifests: `package.json`, `Cargo.toml`, `pyproject.toml`, `go.mod`, `composer.json`
   - Version control: `.git/` directory
   - Container config: `docker-compose.yml`, `Dockerfile`
   - DockYard config: `.dockyard.json` (optional project-level overrides)
2. **Settings-based paths**: Users can manually configure additional project directories via the Settings tab (path picker UI)
3. **Live filesystem watching**: Detects new projects added to configured directories without requiring restart
4. **Direct access**: Can read project files, run local health checks on `localhost` ports, access local git history

```
~/projects/                    ← Parent directory (scan root)
├── DockYard/                  ← DockYard installation
├── project-alpha/             ← Auto-discovered (has package.json + .git/)
├── project-beta/              ← Auto-discovered (has go.mod + Dockerfile)
├── project-gamma/             ← Auto-discovered (has package.json)
└── random-notes/              ← Ignored (no project indicators)
```

### Deployed / VPS Mode

When running on a VPS or remote server, filesystem scanning isn't meaningful — projects are containers, not sibling directories. DockYard uses **integration-based discovery**:

1. **Dokploy API**: Lists all applications and compose services deployed on the Dokploy instance. Each Dokploy app maps to a DockYard project automatically.
2. **GitHub Integration**: Connected GitHub account/org provides repo list. Repos can be linked to projects for commit/PR/issue tracking.
3. **Manual Registration**: Projects can be added manually via the UI or API with a Dokploy app ID, GitHub repo URL, or standalone health endpoint.
4. **Hybrid**: A single project can have multiple discovery sources (e.g., Dokploy app + GitHub repo + custom health endpoint).

### Discovery Source Priority

When the same project is found via multiple sources, DockYard merges the data:

| Source | Provides |
|--------|----------|
| Filesystem (local) | Project type, tech stack detection, local git history, file-level access |
| Dokploy API | Container status, deploy history, env vars, resource usage, redeploy capability |
| GitHub | Commits, PRs, issues, releases, CI results, repo metadata |
| Manual / `.dockyard.json` | Name overrides, custom health endpoints, DIP level config, project metadata |

## System Topology

```
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js 15 Application                      │
│                                                                 │
│  [Middleware: Subdomain Router]                                 │
│       ↓              ↓                ↓                        │
│  (home) routes   (projects) routes  (watchtower) routes        │
│       ↓              ↓                ↓                        │
│  ┌────────────────────────────────────────────────────┐        │
│  │              API Routes Layer                       │        │
│  │  /api/ingest  /api/discovery  /api/dokploy         │        │
│  │  /api/hetzner /api/projects   /api/*               │        │
│  └──────────────────────┬─────────────────────────────┘        │
│                         │                                       │
│  ┌──────────────────────▼─────────────────────────────┐        │
│  │              Service Layer (src/lib/)                │        │
│  │  discovery/ ingestion/ dokploy/ hetzner/ alerts/    │        │
│  │  health/ metrics/ ai/ auth/ crypto/ slo/ config/   │        │
│  │  incidents/ deployments/ tests/ actions/ logger/   │        │
│  │  notifications/ projects/ kuma/                    │        │
│  └──────────────────────┬─────────────────────────────┘        │
│                         │                                       │
│  ┌──────────────────────▼─────────────────────────────┐        │
│  │         Background Workers (Inngest)                │        │
│  │  health-check  alert-evaluator  alert-escalation     │        │
│  │  signal-processor  billing-calculator  ai-summary   │        │
│  │  project-scanner  slo-calculator  confidence-scorer │        │
│  │  deploy-tracker  auto-rollback  hetzner-metrics     │        │
│  │  test-runner  metrics-scraper                       │        │
│  └──────────────────────┬─────────────────────────────┘        │
│                         │                                       │
│  ┌──────────────────────▼─────────────────────────────┐        │
│  │         PostgreSQL + TimescaleDB                    │        │
│  │  (Drizzle ORM)                                      │        │
│  └─────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
   Hetzner Cloud API    Dokploy API         GitHub API/Webhooks
         │                                         │
   Uptime Kuma API                          Local Filesystem
   (optional)                               (dev mode only)
```

## Data Flow

### Project Discovery Flow

```
Startup / Settings Change / Scheduled Scan
        │
        ▼
┌─ Operating Mode? ────────────────────────────────┐
│                                                   │
│  LOCAL                          VPS/DEPLOYED      │
│  Scan configured dirs           Query Dokploy API │
│  Detect project indicators      Query GitHub API  │
│  Read .dockyard.json            Read manual reg.  │
│                                                   │
└──────────────┬────────────────────┬───────────────┘
               │                    │
               └────────┬───────────┘
                        ▼
              Merge & Deduplicate
              (match by slug, repo URL, or Dokploy app ID)
                        │
                        ▼
              Upsert to Project table
              Emit "project.discovered" event
                        │
                        ▼
              Visible in Settings → Projects tab
              (user can accept, ignore, or configure)
```

### Ingestion Pipeline
External sources → Webhook Receiver → Validation → Normalization → Signal_Event store → Background Workers → Dashboard State / Alerts / AI Snapshots

### Config Update Flow
UI → DockYard API → Validate → Audit Log → Dokploy saveEnvironment → Dokploy redeploy → Poll status → SSE to UI

### Health Check Flow
Inngest cron (30s) → HTTP GET /healthz per project → Store Health_Check_Result → Aggregate to Project_Health → Evaluate Alert Rules → Dispatch Notifications

### Uptime Kuma Integration Flow
Kuma monitors projects externally → Status change triggers webhook → POST /api/ingest/kuma → Normalize to SignalEvent → Alert evaluation → SSE broadcast. Alternatively, projects with `monitoringSource: "kuma"` delegate uptime/component-health queries to the Kuma status page JSON API instead of querying TimescaleDB.

### Kuma Push Reporter Flow
DockYard self-health check → Report status to Kuma push monitor → Kuma tracks DockYard uptime externally. If push stops arriving within the configured interval, Kuma marks DockYard as down.

### Kuma Federation Flow
External project's Kuma instance → DockYard fetches public status page JSON → Normalize to FederatedHealthData → Display in Watchtower alongside internally-monitored projects.

### SLO Budget Flow
Inngest cron (5min) → Load active SLOs → Query health_check_results / metric_points → Calculate budget remaining + burn rate → Update slo_budgets → Check burn-rate thresholds (14.4x/6x/3x) → Fire severity-appropriate alert → SSE broadcast

### Incident Lifecycle Flow
SEV1/SEV2 alert fires → Auto-create incident (30min dedup window) → investigating → identified → monitoring → resolved (MTTR calculated) → postmortem (AI draft) → publish

### Metrics Scraping Flow (DIP Level 2)
Inngest cron (60s) → Load DIP L2+ projects → GET /metrics → Parse Prometheus text format → Store metric_points → SSE broadcast

### CloudEvents Ingestion Flow (DIP Level 3)
External project → POST /api/ingest (CloudEvents + Standard Webhooks signature) → Validate + parse → Route by event type → Update deployment/alert/health/config state → SSE broadcast

### Smoke Test Flow
Manual trigger or post-deploy event → Load test configs → HTTP requests per endpoint → Validate status + body + latency → Store test_runs results → SSE broadcast

## Logging

DockYard uses **Pino** for structured JSON logging across all layers:

- **`src/lib/logger/index.ts`** — Root logger instance with environment-aware log levels
- **`src/lib/logger/context.ts`** — Request-scoped child loggers with correlation IDs, user context, and route metadata
- **`src/lib/logger/middleware.ts`** — Next.js middleware integration for automatic request/response logging
- **`src/lib/logger/drizzle.ts`** — Drizzle ORM query logger (logs slow queries above configurable threshold)
- **`src/lib/logger/inngest.ts`** — Inngest job execution logger with function name and event context
- **`src/lib/logger/sampling.ts`** — Log sampling for high-volume events (health checks, SSE heartbeats) to reduce noise

All logs are structured JSON in production, pretty-printed in development. Log levels follow the standard hierarchy: `fatal > error > warn > info > debug > trace`.

## Testing

### Unit & Integration Tests (Vitest)

- Configuration: `vitest.config.ts`
- Test files: `src/**/*.test.ts` (colocated with source) + `src/__tests__/` (integration)
- Setup: `test/setup.ts` with shared fixtures in `test/helpers/fixtures.ts`
- Coverage: V8 provider targeting `src/lib/**` and `src/app/api/**`
- Key test suites: alert evaluator, burn-rate, SLO calculator, crypto, permissions, uptime, log sampling, discovery scanner, config service, incident lifecycle, notification dispatcher

### E2E Tests (Playwright)

- Configuration: `playwright.config.ts`
- Test files: `e2e/*.spec.ts` (dashboard, projects, watchtower, settings, navigation)
- Runs against `DOCKYARD_DEMO=true` on port 3001 — no database or external APIs needed
- Browser: Chromium only, fully parallel, 2 retries in CI

### CI/CD Pipeline

GitHub Actions workflow at `.github/workflows/test.yml` runs on push to `main`, `feat/**`, and `testing` branches:

1. **Static Analysis** — TypeScript type-check (`tsc --noEmit`) + ESLint
2. **Unit & Integration Tests** — Vitest with verbose reporter (depends on static analysis)
3. **E2E Tests** — Playwright with `DOCKYARD_DEMO=true` (depends on static analysis, runs in parallel with unit tests)

Failed test artifacts (test results, Playwright reports) are uploaded for debugging.

## Security

- OAuth2 SSO + MFA (FIDO2/TOTP) for authentication
- RBAC with 4 roles: superadmin, project_admin, viewer, machine
- **API route guards**: All endpoints use `withAuth()` (static routes) or `withAuthContext()` (dynamic routes) from `src/lib/auth/guards.ts`. Only `/api/health` is intentionally public. When `DOCKYARD_AUTH_ENABLED=false`, guards return an anonymous superadmin.
- JIT re-authentication for destructive operations
- All config values AES-256-GCM encrypted at rest
- Webhook signature verification (HMAC-SHA256) — GitHub webhooks require `X-Hub-Signature-256` header when `GITHUB_WEBHOOK_SECRET` is configured
- SSE broadcast endpoint protected by localhost check + `SSE_BROADCAST_SECRET` bearer token
- Audit logging on all mutations
- Local mode filesystem access restricted to configured scan directories only
