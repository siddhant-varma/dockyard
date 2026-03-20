# Components

## Services

### DockYard (Management Plane)

| Service | Path | Responsibility |
|---------|------|---------------|
| Project Discovery | `src/lib/discovery/` | Auto-discovers projects via filesystem scanning (local) or API integration (VPS). Merges sources, deduplicates, upserts to Project table. |
| Dokploy Client | `src/lib/dokploy/` | Wraps Dokploy API calls (deploy, env, monitoring). Also serves as a discovery source in VPS mode. |
| Hetzner Client | `src/lib/hetzner/` | Wraps Hetzner Cloud API (metrics, pricing, status) |
| Ingestion Engine | `src/lib/ingestion/` | Validates, normalizes, and stores incoming events |
| AI Layer | `src/lib/ai/` | Generates summaries, context blocks, suggestions |
| Auth | `src/lib/auth/` | OAuth2, MFA, RBAC middleware |
| Crypto | `src/lib/crypto/` | AES-256-GCM encryption for config values |

### Watchtower (Observation Plane)

| Service | Path | Responsibility |
|---------|------|---------------|
| Health Poller | `src/lib/health/` | Polls project health endpoints on schedule |
| Alert Engine | `src/lib/alerts/` | Evaluates metrics against alert rules, dispatches notifications |
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

> To be populated as endpoints are implemented.

### Discovery & Settings

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/discovery/scan` | Trigger project scan (local: filesystem, VPS: Dokploy + GitHub) |
| GET | `/api/discovery/sources` | List configured discovery sources |
| POST | `/api/discovery/sources` | Add/update a discovery source (path, GitHub org, Dokploy instance) |
| DELETE | `/api/discovery/sources/:id` | Remove a discovery source |
| GET | `/api/settings` | Get platform settings (operating mode, scan paths, integrations) |
| PUT | `/api/settings` | Update platform settings |

### Core

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/ingest` | CloudEvents webhook receiver |
| GET | `/api/health` | DockYard's own health check |
| GET/POST | `/api/projects/*` | Project CRUD |
| GET/POST | `/api/config/*` | Config management |
| GET/POST | `/api/alerts/*` | Alert rules and events |
| GET/POST | `/api/tests/*` | Test suite management |
| * | `/api/dokploy/*` | Dokploy API proxy |
| * | `/api/hetzner/*` | Hetzner API proxy |
| GET | `/api/sse` | SSE stream for real-time dashboard updates |
| POST | `/api/sse/broadcast` | Internal SSE broadcast trigger (Inngest → clients) |

## Models

> See `src/db/schema.ts` for Drizzle schema definitions.
> See `Roadmap.md` §17 for full schema documentation.
