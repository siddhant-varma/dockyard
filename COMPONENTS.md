# Components

## Services

### DockYard (Management Plane)

| Service | Path | Responsibility |
|---------|------|---------------|
| Project Discovery | `src/lib/discovery/` | Auto-discovers projects via filesystem scanning (local) or API integration (VPS). Merges sources, deduplicates, upserts to Project table. |
| Dokploy Client | `src/lib/dokploy/` | Wraps Dokploy API calls (deploy, env, monitoring). Also serves as a discovery source in VPS mode. |
| Hetzner Client | `src/lib/hetzner/` | Wraps Hetzner Cloud API (metrics, pricing, status) |
| Ingestion Engine | `src/lib/ingestion/` | Validates, normalizes, and stores incoming events |
| AI Layer | `src/lib/ai/` | Velocity calculator, confidence scoring, weekly summaries, milestone wrap-ups, context handoff blocks |
| SLO Service | `src/lib/slo/` | SLO definitions CRUD, budget calculator, burn-rate threshold evaluation |
| Config Management | `src/lib/config/` | Encrypted config CRUD, templates, categories, presets, auto-rollback |
| Auth | `src/lib/auth/` | OAuth2, MFA (WebAuthn/TOTP), RBAC, project-scoped permissions, audit logging, JIT re-auth |
| Projects | `src/lib/projects/` | Project CRUD, phase timeline, blocker tracking |
| Crypto | `src/lib/crypto/` | AES-256-GCM encryption for config values |

### Watchtower (Observation Plane)

| Service | Path | Responsibility |
|---------|------|---------------|
| Health Poller | `src/lib/health/` | Polls project health endpoints on schedule |
| Alert Engine | `src/lib/alerts/` | Evaluates rules, deduplication, grouping, escalation, burn-rate alerts, weekly review |
| Metrics Collector | `src/lib/metrics/` | Collects, aggregates, and stores time-series metrics |
| Notifications | `src/lib/notifications/` | Multi-channel dispatch (email, Slack, push) |
| SSE Emitter | `src/lib/sse/` | Server-Sent Events broadcast, client hooks (useSSE, useRealtimeData) |

## Project Discovery Module

### Discovery Sources

| Source | Mode | Detection Method |
|--------|------|-----------------|
| Local Filesystem | Local dev | Scans sibling dirs for `package.json`, `.git/`, `Dockerfile`, etc. |
| Dokploy API | VPS/Deployed | Lists all applications and compose services from Dokploy |
| GitHub API | Both | Lists repos from connected account/org, matches to projects |
| Manual | Both | User adds project via Settings UI or API |
| `.dockyard.json` | Local dev | Project-level config file with DockYard metadata |

### `.dockyard.json` Schema

Optional file a project can include to customize how DockYard discovers and tracks it:

```json
{
  "name": "Project Alpha",
  "slug": "project-alpha",
  "description": "Example web application",
  "techStack": ["next.js", "typescript", "postgresql"],
  "healthEndpoint": "http://localhost:3001/healthz",
  "dipLevel": 1,
  "ignore": false
}
```

## API Endpoints

All endpoints require authentication via `withAuth()` or `withAuthContext()` unless noted otherwise. When `DOCKYARD_AUTH_ENABLED=false` (default for local dev), auth returns an anonymous superadmin.

### Discovery & Settings

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/discovery` | `withAuth` | Trigger project scan (local: filesystem, VPS: Dokploy + GitHub) |
| GET | `/api/discovery/sources` | `withAuth` | List configured discovery sources |
| POST | `/api/discovery/sources` | `withAuth` (superadmin) | Add a discovery source |
| PUT | `/api/discovery/sources/:id` | `withAuthContext` (superadmin) | Update a discovery source |
| DELETE | `/api/discovery/sources/:id` | `withAuthContext` (superadmin) | Remove a discovery source |
| GET | `/api/settings` | `withAuth` | Get platform settings |
| PUT | `/api/settings` | `withAuth` (superadmin) | Update platform settings |

### Projects

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/projects` | inline `auth()` | List projects (filtered by role) |
| POST | `/api/projects` | inline `auth()` | Create project |
| GET | `/api/projects/:slug` | `withAuthContext` | Project detail |
| PUT | `/api/projects/:slug` | `withAuthContext` | Update project |
| DELETE | `/api/projects/:slug` | `withAuthContext` (superadmin) | Archive project |
| GET | `/api/projects/:slug/config` | `withAuthContext` | List config entries (secrets masked) |
| PUT | `/api/projects/:slug/config/:id` | inline `auth()` | Update config entry |
| DELETE | `/api/projects/:slug/config/:id` | inline `auth()` | Delete config entry |
| POST | `/api/projects/:slug/config/apply` | inline `auth()` | Apply config to Dokploy + redeploy |
| GET | `/api/projects/:slug/activity` | `withAuthContext` | Paginated signal events |
| GET | `/api/projects/:slug/deployments` | `withAuthContext` | Deployment history |
| GET | `/api/projects/:slug/logs` | `withAuthContext` | Fetch logs from Dokploy |
| GET | `/api/projects/:slug/members` | `withAuthContext` | List project members |
| POST | `/api/projects/:slug/members` | `withAuthContext` (superadmin) | Add project member |
| PUT | `/api/projects/:slug/members` | `withAuthContext` (superadmin) | Update member role |
| DELETE | `/api/projects/:slug/members` | `withAuthContext` (superadmin) | Remove member |
| GET | `/api/projects/:slug/slo` | `withAuthContext` | List SLO definitions with budget data |
| POST | `/api/projects/:slug/slo` | `withAuthContext` (project admin) | Create SLO |
| PUT | `/api/projects/:slug/slo` | `withAuthContext` (project admin) | Update SLO |
| DELETE | `/api/projects/:slug/slo` | `withAuthContext` (project admin) | Delete SLO |
| GET | `/api/projects/:slug/config/templates` | `withAuthContext` | List config templates |
| POST | `/api/projects/:slug/config/templates` | `withAuthContext` (project admin) | Create/apply/save template |
| DELETE | `/api/projects/:slug/config/templates` | `withAuthContext` (project admin) | Delete template |
| GET | `/api/projects/:slug/config/rollback` | `withAuthContext` | Get auto-rollback config |
| PUT | `/api/projects/:slug/config/rollback` | `withAuthContext` (project admin) | Configure auto-rollback |
| GET | `/api/projects/:slug/confidence` | `withAuthContext` | Get confidence score + breakdown |
| GET | `/api/projects/:slug/summaries` | `withAuthContext` | List AI-generated summaries |
| GET | `/api/projects/:slug/handoff` | `withAuthContext` | Generate context handoff block (JSON/Markdown) |

### Auth

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/auth/reauth` | `withAuth` | Check JIT re-auth status |
| POST | `/api/auth/reauth` | `withAuth` | Confirm re-authentication (FIDO2/TOTP) |

### Watchtower

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/health` | **Public** | DockYard's own health check (for external monitors) |
| GET | `/api/health/projects` | `withAuth` | All projects health summary |
| GET | `/api/health/projects/:slug` | `withAuthContext` | Single project health detail |
| GET | `/api/alerts` | `withAuth` | List alert rules |
| POST | `/api/alerts` | `withAuth` | Create alert rule |
| GET | `/api/alerts/events` | `withAuth` | Active alert events |

### Infrastructure

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/hetzner/servers` | `withAuth` | List Hetzner servers |
| GET | `/api/hetzner/servers/:id/metrics` | `withAuthContext` | Server metrics time series |
| GET | `/api/hetzner/status` | `withAuth` | Server status card data |
| GET | `/api/hetzner/billing` | `withAuth` | Latest billing estimate |
| GET | `/api/dokploy` | `withAuth` | Dokploy proxy (stub — 501) |

### Ingestion

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/ingest` | stub (501) | CloudEvents webhook receiver |
| POST | `/api/ingest/github` | Webhook signature | GitHub webhook receiver |

### Real-Time & Internal

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/sse` | `requireAuth` | SSE stream for real-time dashboard updates |
| POST | `/api/sse/broadcast` | localhost or `SSE_BROADCAST_SECRET` | Internal SSE broadcast trigger (Inngest → clients) |

### Stubs (not yet implemented)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/tests` | `withAuth` | Test suite management (stub — 501) |
| GET | `/api/config` | `withAuth` | Config management (stub — 501) |

## Models

> See `src/db/schema.ts` for Drizzle schema definitions.
> See `Roadmap.md` §17 for full schema documentation.
