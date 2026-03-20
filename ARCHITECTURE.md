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
│  │  notifications/ projects/                           │        │
│  └──────────────────────┬─────────────────────────────┘        │
│                         │                                       │
│  ┌──────────────────────▼─────────────────────────────┐        │
│  │         Background Workers (Inngest)                │        │
│  │  health-check  alert-evaluator  alert-escalation     │        │
│  │  signal-processor  billing-calculator  ai-summary   │        │
│  │  project-scanner  slo-calculator  confidence-scorer │        │
│  │  deploy-tracker  auto-rollback  hetzner-metrics     │        │
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
                                                   │
                                            Local Filesystem
                                            (dev mode only)
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
