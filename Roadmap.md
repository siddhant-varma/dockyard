# DockYard — Product Roadmap & System Design

> **Version**: 2.0 — March 2026
> **Codename**: DockYard Watchtower
> **Author**: DockYard Contributors
> **Status**: Planning & Research Phase

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Problem Statement & Market Validation](#2-problem-statement--market-validation)
3. [Competitive Landscape & Inspiration](#3-competitive-landscape--inspiration)
4. [Platform Architecture Overview](#4-platform-architecture-overview)
5. [Surface Map — Subdomains & Pages](#5-surface-map--subdomains--pages)
6. [Feature Specification — Home Dashboard](#6-feature-specification--home-dashboard)
7. [Feature Specification — Projects Portal](#7-feature-specification--projects-portal)
8. [Feature Specification — Watchtower](#8-feature-specification--watchtower)
9. [Project Lifecycle & Progress Tracking](#9-project-lifecycle--progress-tracking)
10. [AI-Augmented Features](#10-ai-augmented-features)
11. [Security, Access Control & Gatekeeping](#11-security-access-control--gatekeeping)
12. [Automating Data Flow — Ingestion & Collection](#12-automating-data-flow--ingestion--collection)
13. [DockYard Integration Protocol (DIP) — Communication Standards for Tracked Projects](#13-dockyard-integration-protocol-dip--communication-standards-for-tracked-projects)
14. [Dokploy API Integration Layer](#14-dokploy-api-integration-layer)
15. [Hetzner Cloud API Integration Layer](#15-hetzner-cloud-api-integration-layer)
16. [Tech Stack](#16-tech-stack)
17. [Database Schema](#17-database-schema)
18. [Architecture & Component Design](#18-architecture--component-design)
19. [Phased Rollout — MVP → Advanced → Future](#19-phased-rollout--mvp--advanced--future)
20. [Pitfalls & Mitigations](#20-pitfalls--mitigations)
21. [Open Questions & Assumptions](#21-open-questions--assumptions)
22. [Research Sources](#22-research-sources)

---

## 1. Executive Summary

DockYard is a **self-hosted, unified operations platform** that bridges the gap between project management narratives and live production observability. It is organized around **two major services**:

1. **DockYard** (Management Plane) — Project discovery, tracking, config management, and control
   - **Home Dashboard** (`dockyard.cc`) — Command center: VPS health, Hetzner metrics, billing, urgent alerts, global settings
   - **Projects Portal** (`projects.dockyard.cc`) — Per-project cards with roadmap progress, phase tracking, blockers, config management, and AI-driven context handoffs. Doubles as a public portfolio showcase.
2. **Watchtower** (Observation Plane) — Health monitoring, alerting, incidents, and ops
   - **Watchtower** (`watchtower.dockyard.cc`) — Live health monitoring, critical logs, test suite orchestration, deployment tracking, and incident management for all deployed projects.

A key design principle is **automatic project discovery**: DockYard dynamically detects projects rather than requiring manual registration. In **local dev mode**, it scans sibling directories for project indicators (package manifests, `.git/`, Dockerfiles). In **VPS/deployed mode**, it discovers projects through Dokploy API integration, GitHub org/account linkage, or manual registration. Users can always fine-tune project sources via the Settings tab.

The platform is designed as a **living system** — marrying human-authored narrative with automated signal detection, explicitly formatting its output to feed independent AI agents while remaining visually compelling as a public-facing portfolio component.

**What makes DockYard different**: Existing solutions are either purely organizational (PM tools like Plane, Taiga), purely metric-based (devActivity, CodeLens), or purely operational (Grafana, Uptime Kuma). DockYard uniquely unifies **project narrative + production health + config management + AI agent context** in a single self-hosted platform tailored for indie developers and small teams running multiple projects on VPS infrastructure (Dokploy on Hetzner).

---

## 2. Problem Statement & Market Validation

### The Problem

Indie developers and small teams running multiple projects on self-hosted VPS infrastructure face a fragmented workflow:

- **Monitoring is scattered** — Dokploy shows container stats, Hetzner shows server metrics, Uptime Kuma shows availability, Sentry shows errors. No single view.
- **Config changes are painful** — Updating an environment variable (e.g., swapping an AI model provider key in a project) requires: SSH → Dokploy panel → find project → edit env → restart compose. Too many steps for a simple config change.
- **Project progress is invisible** — What's deployed, what's in-progress, what's blocked, what's next — this context lives in the developer's head, scattered GitHub issues, or nowhere.
- **No operational awareness** — When something breaks at 2 AM, there's no unified alert system that knows *which project* is affected, *what changed recently*, and *who to notify*.
- **AI agents lack context** — When using AI coding assistants, there's no structured way to hand off "here's where this project stands" without manual copy-paste.

### Reddit & Community Validation

Research across r/selfhosted (650K+ weekly visitors), r/devops, and r/homelab reveals consistent patterns:

- **The "single dashboard" desire is universal** — Multiple threads and articles document users replacing 3-5 monitoring tools with a single self-hosted dashboard. The article "This single self-hosted dashboard replaced my entire monitoring setup" (MakeUseOf, 2025) captured significant community engagement.
- **Config management pain is real** — Dockge emerged specifically because "running long commands to modify single arguments in config files can be grueling." The community gravitates toward tools that simplify environment variable management.
- **The gap between deploy platform and monitoring is acknowledged** — Comparisons between Coolify and Dokploy consistently note that while both offer basic monitoring, neither provides project-level context, roadmap tracking, or unified alerting across projects.
- **Indie developers want Vercel-like DX on self-hosted infra** — The 2024 r/selfhosted survey showed 97% container adoption, indicating a community ready for sophisticated tooling but lacking unified platforms.
- **No existing tool combines project narrative + ops monitoring + config management** — Tools like Backstage (Spotify's IDP) come closest but are enterprise-focused and lack the personal/portfolio dimension.

### Who DockYard Is For

- Solo developers running 3-15 projects on a single VPS or small cluster
- Small teams (2-5 people) who need operational awareness without enterprise tooling overhead
- Developers who want their project portfolio to reflect real, live data rather than static showcases
- Anyone using Dokploy/Coolify on Hetzner/bare-metal who wants a layer above the deploy platform

---

## 3. Competitive Landscape & Inspiration

### Direct Competitors (None match the full scope)

| Tool | What It Does Well | What It Lacks |
|------|-------------------|---------------|
| **Backstage** (Spotify/CNCF) | Service catalog, plugin ecosystem, developer portal | Enterprise-only complexity, no personal/portfolio dimension, no config management |
| **Grafana + LGTM Stack** | Best-in-class metrics visualization, alerting | No project narrative, no config management, no roadmap tracking |
| **Uptime Kuma** (57K GitHub stars) | Simple, beautiful uptime monitoring | Only monitors availability — no metrics, no config, no project context |
| **Dokploy** (Built-in monitoring) | Container-level CPU/memory/network in real-time | No cross-project unified view, no alerting beyond basic, no roadmap |
| **Coolify** (50K+ GitHub stars) | One-click deploys, auto-SSL, monitoring | Similar gaps to Dokploy — operational but not contextual |
| **Homepage / Dashy / Homarr** | Beautiful homelab dashboards, service discovery | Status-only widgets — no deep monitoring, no config management, no project tracking |
| **OneUptime** | Full SRE platform (monitoring, incidents, status pages) | No project management dimension, enterprise-focused |
| **Plane / Taiga** | Agile project management, kanban, sprints | Zero operational monitoring — purely organizational |
| **Portainer** | Container management UI | No project-level abstraction, no alerting, no roadmap |
| **Beszel** | Lightweight server monitoring (6MB RAM agent) | Monitoring only — no project context or config management |

### Key Inspirations

- **Vercel Dashboard**: The gold standard for DX — deploy status, logs, env vars, analytics all in one clean UI per project
- **Backstage Service Catalog**: The concept of a unified registry of all services with ownership, dependencies, and metadata
- **Linear**: Clean, keyboard-driven project management with status awareness
- **Grafana**: Visualization excellence — embeddable panels, flexible data sources
- **Broadcom WatchTower Platform**: Enterprise mainframe observability — cross-silo event correlation, incident identification

### DockYard's Unique Position

```
                    Project Narrative / Roadmap
                              ↑
                              |
    Config Management ←—— DockYard ——→ Production Health
                              |
                              ↓
                    AI Agent Context Handoff
```

No existing tool occupies this intersection. DockYard is not trying to replace Grafana for deep metrics or Plane for sprint management — it's the **connective tissue** between deploy platform (Dokploy), infrastructure (Hetzner), project planning, and operational awareness.

---

## 4. Platform Architecture Overview

### Two Services, One Codebase

DockYard is organized around two major services that share a single Next.js deployment:

| Service | Subdomains | Responsibility |
|---------|-----------|---------------|
| **DockYard** (Management) | `dockyard.cc`, `projects.dockyard.cc` | Project discovery, tracking, config management, control, portfolio |
| **Watchtower** (Observation) | `watchtower.dockyard.cc` | Health monitoring, alerting, incidents, test orchestration |

### Dual Operating Modes

| Aspect | Local Dev Mode (`localhost`) | VPS / Deployed Mode |
|--------|------------------------------|---------------------|
| **Project Discovery** | Filesystem scan of sibling directories | Dokploy API + GitHub integration |
| **Health Checks** | `localhost` port probing | HTTP(S) endpoint polling |
| **Config Management** | Read-only (no deploy platform) | Full env var management via Dokploy API |
| **Metrics** | Basic (local process stats) | Full (Hetzner + Dokploy + DIP metrics) |
| **Typical User** | Developer running `npm run dev` across projects | Operator managing production containers |

### System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DockYard Platform                            │
│                                                                     │
│  ┌─ DockYard Service ────────────────┐  ┌─ Watchtower Service ───┐ │
│  │  dockyard.cc    projects.         │  │  watchtower.           │ │
│  │  (Home Dash)    dockyard.cc       │  │  dockyard.cc           │ │
│  │                 (Projects Portal) │  │  (Health & Ops)        │ │
│  └──────────┬────────────────────────┘  └───────────┬────────────┘ │
│             │                                       │              │
│             └───────────────┬───────────────────────┘              │
│                             │                                       │
│                    ┌────────▼────────┐                              │
│                    │   API Layer     │                              │
│                    │  (Next.js API   │                              │
│                    │   Routes)       │                              │
│                    └────────┬────────┘                              │
│                             │                                       │
│     ┌───────────────────────┼───────────────────────┐              │
│     │              │        │        │              │              │
│  ┌──▼──────┐  ┌────▼────┐ ┌▼──────┐ ┌▼───────────┐ │              │
│  │Discovery│  │Ingestion│ │Inngest│ │AI Context  │ │              │
│  │Engine   │  │Engine   │ │Workers│ │& Generation│ │              │
│  └──┬──────┘  └────┬────┘ └┬──────┘ └┬───────────┘ │              │
│     │              │        │        │              │              │
│     └───────────────────────┼───────────────────────┘              │
│                             │                                       │
│                    ┌────────▼────────┐                              │
│                    │   PostgreSQL    │                              │
│                    │  + TimescaleDB  │                              │
│                    └─────────────────┘                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
         │             │              │              │
         ▼             ▼              ▼              ▼
   ┌───────────┐ ┌───────────┐ ┌──────────┐ ┌──────────────┐
   │  Hetzner  │ │  Dokploy  │ │  GitHub  │ │    Local     │
   │  Cloud API│ │  API      │ │  API     │ │  Filesystem  │
   └───────────┘ └───────────┘ └──────────┘ └──────────────┘
                                              (dev mode only)
```

---

## 5. Surface Map — Subdomains & Pages

### `dockyard.cc` — Home Dashboard (Admin Only)

| Page | Purpose | Audience |
|------|---------|----------|
| **Home** | VPS health overview, Hetzner metrics, billing, urgent alerts | Superadmin |
| **Settings** | Project discovery config, scan directories, integrations (GitHub, Dokploy), user management, API keys, notification channels, global config | Superadmin |
| **Settings → Projects** | Discovered projects list, accept/ignore projects, configure project paths (directory picker), link discovery sources | Superadmin |
| **Settings → Integrations** | GitHub account/org connection, Dokploy instance URL + API key, operating mode toggle (local/VPS) | Superadmin |
| **About** | Platform info, version, documentation links | All authenticated |

### `projects.dockyard.cc` — Projects Portal

| Page | Purpose | Audience |
|------|---------|----------|
| **Landing / Portfolio** | Aggregated public portfolio view, high-level stats, active vs. completed | Public |
| **Project Listing** | Searchable grid of project cards with status indicators and progress | Public (filtered) / Admin (unfiltered) |
| **Project Detail** | Full project view: roadmap, phases, blockers, activity feed, config panel | Public (limited) / Admin (full) |
| **Project Config Panel** | Environment variables editor, service parameters, model selection | Admin only |

### `watchtower.dockyard.cc` — Watchtower (Admin Only)

| Page | Purpose | Audience |
|------|---------|----------|
| **Overview** | Grid of project health cards with severity indicators | Admin |
| **Project Health Detail** | Component-level health, metrics graphs, critical logs, deployment history | Admin |
| **Test Suite Runner** | Remote test orchestration: smoke tests, integration tests, health checks | Admin |
| **Incidents & Alerts** | Alert rules, active incidents, incident timeline, post-mortems | Admin |
| **Alert Configuration** | Create/edit alert rules, notification channels, escalation policies | Superadmin |

---

## 6. Feature Specification — Home Dashboard (`dockyard.cc`)

### 6.1 VPS Server Health Overview

A minimal, clean dashboard providing at-a-glance operational awareness.

**Critical Metrics Panel:**
- **CPU utilization** — Current %, 24h sparkline, threshold indicator (green/yellow/red)
- **Memory usage** — Used/Total GB, percentage, swap usage
- **Disk I/O** — Read/write IOPS, bandwidth, storage capacity used/available
- **Network** — Bandwidth in/out (Mbps), packet rate, current connections
- **Server uptime** — Days since last restart
- **Docker container count** — Running / Stopped / Total

**Data Source**: Hetzner Cloud API (`GET /servers/{id}/metrics`) for CPU, disk, network. System-level agent (node-exporter or custom lightweight script on VPS) for memory, swap, Docker stats.

### 6.2 Hetzner Account Metrics

**Usage & Billing Panel:**
- **Current month spend** — Running total in EUR, projected end-of-month estimate
- **Resource allocation** — Server type, location, IPv4/IPv6, attached volumes, floating IPs
- **Traffic consumption** — Ingress/egress against included allowance, overage cost if applicable
- **Snapshot count & storage** — Number of snapshots, total storage used
- **Billing history** — Last 6 months trend chart

**Data Source**: Hetzner Cloud API (`api.hetzner.cloud`). Note: Hetzner's API provides server metrics (CPU, disk, network) directly. Billing data may require scraping or the Robot API (`robot-ws.your-server.de`) for dedicated server billing. The Grafana Hetzner Cloud plugin (`apricote-hcloud-datasource`) can serve as a reference implementation.

### 6.3 Urgent Alerts & Warnings Strip

A persistent top bar or sidebar section showing:
- **Active SEV1/SEV2 incidents** across all projects with one-click drill-down to Watchtower
- **Config drift warnings** — Any project where running config differs from declared state
- **Certificate expiry** — SSL certs expiring within 14 days
- **Resource exhaustion warnings** — Disk > 85%, Memory > 90%, CPU sustained > 80%
- **Failed deployments** — Any project whose last deploy failed
- **Stale projects** — Projects with no activity for 14+ days (prompts for status update)

### 6.4 Quick Actions

- **One-click redeploy** any project (via Dokploy API)
- **Quick env var update** — Modal to update a single variable without navigating to project detail
- **Server restart** (with confirmation gate)
- **Generate AI context snapshot** for any project

---

## 7. Feature Specification — Projects Portal (`projects.dockyard.cc`)

### 7.1 Project Cards (Listing View)

Each project card displays:
- **Project name & logo/icon**
- **Status badge**: Discovery | Active | Paused | Completed | Archived
- **Health indicator**: Healthy (green) | Degraded (yellow) | Down (red) — pulled from Watchtower
- **Progress bar**: Percentage of roadmap items completed
- **Last activity**: "3 commits today" / "Deployed 2h ago" / "No activity for 5 days"
- **Tech stack tags**: React, Node.js, PostgreSQL, etc.
- **Quick actions**: Deploy, View Logs, Open Config

Public visitors see a filtered, read-only version without health indicators, deploy buttons, or config access.

### 7.2 Project Detail View (on click)

**Tabs within project detail:**

#### Overview Tab
- **Description** — Human-authored project summary
- **Current phase** — Which phase the project is in (Discovery → MVP → Beta → Production → Maintenance)
- **Phase timeline** — Visual timeline showing achieved phases (with dates) and planned phases (with estimates)
- **What's Next** — Top 3-5 upcoming roadmap items with estimated completion
- **Blockers** — Active blockers with severity and owner
- **Recent activity feed** — Merged timeline of automated signals (commits, deploys, PRs) and manual checkpoints/notes

#### Roadmap Tab
- **Kanban or list view** of all roadmap items grouped by phase
- **Status per item**: Planned | In Progress | Completed | Blocked
- **Confidence scoring** — AI-inferred likelihood of hitting timeline based on recent velocity
- **Dependency mapping** — Which items block which

#### Activity Tab
- **Full chronological feed** — Every signal event, checkpoint, deploy, and note
- **Filterable by source**: GitHub, Dokploy, Manual, AI-generated
- **Exportable** — JSON/Markdown for AI agent consumption

#### Config Panel Tab (Admin Only)
- **Environment Variables Editor** — Full CRUD for project environment variables
  - Displays current variables with masked values (click to reveal)
  - Edit inline with validation
  - **"Apply & Restart"** button that:
    1. Calls Dokploy API `POST /application.saveEnvironment` or `POST /compose.update` with updated env
    2. Triggers `POST /application.redeploy` or `POST /compose.redeploy`
    3. Shows real-time deploy status via SSE
  - **Diff view** before applying — shows exactly what changed
  - **Rollback** — One-click revert to previous env state (maintained in `Config_Audit_Log`)

- **Service Parameters** — Project-specific config beyond env vars
  - Example for **a tracked project**: A dedicated "AI Provider" section with:
    - Dropdown: Select LLM provider (OpenAI, Anthropic, Groq, Ollama, etc.)
    - Text field: API Key (masked, with "Test Connection" button)
    - Dropdown: Select model (auto-populated based on provider)
    - Slider: Temperature, max tokens
    - These map to environment variables (`AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`, etc.)
    - Changing any of these triggers the Apply & Restart flow

- **Config Templates** — Predefined config profiles (e.g., "Development", "Production", "Testing")
- **Config History** — Full audit trail: who changed what, when, with diff view and rollback

**How Config Panel Works Under the Hood:**

```
User edits env var in DockYard UI
        │
        ▼
DockYard API validates input
        │
        ▼
Stores old value hash in Config_Audit_Log
        │
        ▼
Calls Dokploy API:
  POST /application.saveEnvironment
    { applicationId: "xxx", env: "KEY=new_value\n...", buildArgs: "" }
        │
        ▼
Calls Dokploy API:
  POST /application.redeploy
    { applicationId: "xxx" }
        │
        ▼
Polls Dokploy deployment status OR receives webhook
        │
        ▼
Updates DockYard Signal_Event with deploy result
        │
        ▼
Pushes status to UI via SSE: "Config applied, redeploying... ✓ Live"
```

### 7.3 Public Portfolio Mode

When `public_visibility` is enabled for a project:
- **Public visitors see**: Description, tech stack, achieved phases, public milestones, live status badge
- **Public visitors DON'T see**: Config panel, private notes, blockers, health details, env vars, logs
- **Embeddable components**: Project cards and status timelines are designable as standalone Web Components or an NPM package for embedding in external portfolios
- **Open API**: Read-only REST/GraphQL endpoint for external consumption

---

## 8. Feature Specification — Watchtower (`watchtower.dockyard.cc`)

### 8.1 Overview — Project Health Grid

A grid of project health cards, sorted by severity (critical first):

Each card shows:
- **Project name** + status badge (Healthy / Degraded / Down / Maintenance)
- **Uptime percentage** — Last 30 days
- **Response time** — p50, p95, p99 latency
- **Error rate** — Last hour trend
- **Last deploy** — Version/commit + time
- **Active alerts count** — With severity breakdown
- **Quick actions**: View Details, Redeploy, Run Smoke Test

### 8.2 Project Health Detail View (on click)

#### Health Metrics Tab
- **Golden Signals Dashboard** per service:
  - **Latency**: Response time distribution (histogram), p50/p95/p99 trend lines
  - **Traffic**: Requests per second, unique visitors (if web app)
  - **Errors**: Error rate %, top error types, error budget remaining
  - **Saturation**: CPU, memory, disk, connection pool utilization

- **Component-Level Health Breakdown**:
  ```
  ┌─ API Server ────────── ✅ Healthy (p95: 120ms, err: 0.1%)
  ├─ Database (Postgres) ── ✅ Healthy (connections: 12/100, size: 2.3GB)
  ├─ Redis Cache ────────── ✅ Healthy (memory: 45MB, hit rate: 94%)
  ├─ Background Worker ──── ⚠️ Degraded (queue depth: 1,247, processing: slow)
  └─ CDN / Static Assets ── ✅ Healthy (cache hit: 98%)
  ```

- **Deployment overlay on metrics** — Vertical markers on time-series graphs showing when deploys happened, enabling instant correlation between deploys and incidents

#### Logs Tab
- **Critical logs stream** — Real-time filtered view of ERROR and FATAL level logs
- **Log search** — Full-text search with time range, severity, and source filters
- **Log patterns** — AI-detected recurring error patterns with frequency
- **Structured log viewer** — JSON log pretty-printing with field extraction

**Data Source**: Dokploy's built-in log aggregation via API, or a lightweight log shipper (Vector/Fluent Bit) to a local Loki instance.

#### Testing Tab
- **Remote Test Suite Runner**:
  - **Smoke Tests** — Hit critical endpoints, verify 200 responses, check response schema
  - **Integration Tests** — Run project's test suite remotely (via SSH/Docker exec or CI trigger)
  - **Load Tests** — Lightweight synthetic load generation (configurable RPS, duration)
  - **Database Health Check** — Connection test, query latency, migration status
  - **Dependency Check** — Verify all external APIs, third-party services are reachable

- **Test Scheduling**:
  - Run on demand (button click)
  - Run on schedule (cron-based via Inngest)
  - Run post-deploy (triggered automatically after any deployment)

- **Test Results History**:
  - Pass/fail trend over time
  - Flaky test detection
  - Performance regression alerts (if p95 increases by >20% between runs)

- **Test Configuration** (per project):
  - Define smoke test endpoints and expected responses
  - Define integration test commands and success criteria
  - Set performance baselines and regression thresholds

#### Deployments Tab
- **Deployment timeline** — Chronological list of all deployments
- **Per-deployment detail**: Commit SHA, author, deploy time, duration, status (success/failed/rolled back)
- **Canary status** — If applicable, percentage rollout and error comparison
- **One-click rollback** — Via Dokploy API, redeploy previous version
- **Deploy diff** — What changed between current and previous deployment

### 8.3 Alerting & Incident Management

#### Alert Rules
- **Rule builder UI**:
  - Select metric (error_rate, latency_p95, uptime, cpu, memory, disk, custom)
  - Select operator (>, <, ==, !=, increases_by_%, sustained_for)
  - Set threshold value
  - Set severity (SEV1-4)
  - Link runbook URL
  - Set notification channels

- **Pre-built alert templates**:
  - "Project down" — Health check fails 3 consecutive times → SEV1
  - "Error spike" — Error rate > 5% for 5 minutes → SEV2
  - "Slow response" — p95 > 2s for 10 minutes → SEV3
  - "Disk filling" — Disk usage > 85% → SEV2
  - "Deploy failed" — Deployment status = failed → SEV2
  - "SSL expiring" — Certificate expires within 7 days → SEV3

#### Alert Routing & Escalation
Based on 2026 best practices (incident.io framework):
- **SEV1** (Critical): Immediate push notification + email + Slack → Auto-escalate after 15 min if unacknowledged
- **SEV2** (Major): Slack notification + email → Escalate after 2 hours
- **SEV3** (Minor): Slack notification → Ticket creation for next business day
- **SEV4** (Cosmetic): Log only → Auto-resolve after 24 hours if not recurring

#### Alert Quality Enforcement
Following the principle "If an alert fires and the on-call engineer cannot take a specific action to resolve it, the alert should not exist":
- **Alert on symptoms, not causes** — "Order processing is dropping requests" not "CPU is high"
- **Alert grouping** — Related alerts within a 5-minute window are consolidated
- **Alert deduplication** — Same alert doesn't fire repeatedly until resolved
- **Weekly alert review** — Built-in audit page showing alert frequency, action rate, and noise score
- **SLO-based burn-rate alerting** — Alert when error budget consumption exceeds 2x expected rate

#### Incident Timeline
- Auto-generated timeline from first alert through resolution
- Captures: alert trigger, acknowledgement, investigation notes, resolution action, deploy/rollback
- Feeds into blameless post-mortem template
- Tracks MTTR, MTTD, MTTA metrics

### 8.4 Notification Channels
- **Email** — Via Resend API
- **Slack** — Via incoming webhooks
- **Push notifications** — Via web-push API (browser notifications)
- **Webhook** — Custom HTTP endpoint for integration with external tools
- **SMS** (future) — Via Twilio for SEV1 only

---

## 9. Project Lifecycle & Progress Tracking

### 9.0 Project Discovery & Onboarding

Before a project enters the lifecycle, it must be **discovered**. DockYard supports automatic and manual discovery depending on the operating mode:

**Local Dev Mode:**
1. DockYard scans sibling directories in the parent folder (and any additional configured paths)
2. Directories with project indicators (`package.json`, `.git/`, `Dockerfile`, etc.) appear in **Settings → Projects** as "Discovered"
3. User can **accept** (adds to project list), **ignore** (hides from future scans), or **configure** (set name, health endpoint, DIP level)
4. Users can also manually add project paths via a directory picker in Settings

**VPS / Deployed Mode:**
1. DockYard queries the connected Dokploy instance for all applications and compose services
2. Optionally queries connected GitHub account/org for repositories
3. Discovered services appear in **Settings → Projects** for review
4. User links Dokploy apps to projects, connects GitHub repos, configures health endpoints

**Hybrid:** A single project can combine multiple sources. For example, a project discovered via Dokploy (container management) can also be linked to a GitHub repo (code tracking) and have a custom health endpoint (DIP Level 1).

### 9.1 Lifecycle States

| State | Description | Automation Behavior |
|-------|-------------|---------------------|
| **Discovered** | Auto-detected by filesystem scan (local) or API integration (VPS). Pending user review in Settings. | None — waiting for user to accept or ignore |
| **Discovery** | Idea capture, early exploration. Accepted by user but minimal integration. | Minimal — only tracks repo creation events |
| **Active** | Continuous ingestion of signals, active checkpoints, confidence scoring | Full — all webhooks active, health checks running |
| **Paused** | Frozen. AI summarizes pause context for smooth handoff upon resumption | Reduced — health checks continue, no progress tracking |
| **Completed** | Frozen state for portfolio showcasing. Key metrics and outcomes highlighted | Monitoring only — health checks + alerts continue |
| **Archived** | Hidden from public. Context compressed for future reference | Dormant — no active monitoring unless opted in |

### 9.2 Progress Tracking Mechanisms

**Manual Checkpoints:**
- Human-authored milestones with narrative context
- Pivot notes explaining direction changes
- Blocker declarations with severity and owner

**Automated Signals:**
- GitHub webhooks: commits, PRs, issues, releases, deployment status
- Dokploy webhooks: deployment events, container status changes
- CI/CD pipeline results: build pass/fail, test coverage changes
- Runtime health: uptime checks, error rate changes, performance shifts

**Confidence Scoring:**
- Algorithmic assessment of timeline accuracy
- Inputs: recent commit cadence vs. roadmap remaining, blocker count, last manual update recency
- Decaying variable: if no manual note exists for 14 days, confidence drops rapidly, flagging need for human validation
- Manual checkpoints always override automated assumptions

**Time Estimation:**
- AI-inferred completion timelines from historical velocity + outstanding tasks
- Displayed as ranges ("2-4 weeks") not precise dates
- Adjusts automatically as velocity data accumulates

---

## 10. AI-Augmented Features

### Context Handoff Blocks
High-density JSON or markdown snapshots of current project state, explicitly designed for an LLM/Agent to read before modifying the codebase:
```json
{
  "project": "Project Alpha",
  "status": "Active",
  "current_phase": "Beta",
  "health": "Healthy",
  "recent_changes": ["Migrated auth to Clerk", "Added rate limiting"],
  "active_blockers": ["WebSocket reconnection flaky on mobile"],
  "next_tasks": ["Implement message reactions", "Add typing indicators"],
  "config": {
    "ai_provider": "anthropic",
    "ai_model": "claude-sonnet-4-5-20250514"
  },
  "production_metrics": {
    "uptime_30d": "99.7%",
    "avg_latency_ms": 145,
    "error_rate": "0.3%"
  }
}
```

### Automated Summaries
- **Weekly digest**: Generated from raw signals + manual notes
- **Milestone wrap-up**: Summary when a roadmap phase completes
- **Incident summary**: Auto-generated post-mortem draft from incident timeline

### Suggested Next Steps
- AI-proposed tasks based on recent code analysis, issue sentiment, roadmap gaps
- Considers production health data — won't suggest new features if error rate is spiking

### Change Detection
- Identifying undocumented scope creep or architectural drifts
- Flagging when codebase changes diverge significantly from the declared roadmap

### AI Context Snapshots (Append-Only Ledger)
- Time-travel capability for AI agents to understand project evolution
- Generated in standard markdown/JSON — agent-framework agnostic
- Validation hash ensures integrity

---

## 11. Security, Access Control & Gatekeeping

### 11.1 Zero Trust Foundation

Following 2026 best practices: **"Never trust, always verify"** — every request is authenticated, authorized, and continuously validated.

### 11.2 Role Hierarchy

| Role | Scope | Capabilities |
|------|-------|-------------|
| **Superadmin** | Global | Full CRUD on all projects + configs, user management, alert rule CRUD, secret rotation triggers, audit log access, server restart, Hetzner API access |
| **Project Admin** | Per-project | Config changes + alert management scoped to owned projects, deployment triggers, test suite execution |
| **Viewer** | Per-project | Read-only dashboards, view metrics/logs, no config changes, no deploy triggers |
| **Machine / Agent** | Per-resource | Scoped API tokens with per-resource read/write grants, short-lived JWTs, audit-logged |
| **Public** | Portfolio only | Read-only access to public project data, no health details, no config, no logs |

### 11.3 Authentication Stack

- **Primary auth**: OAuth2 SSO via GitHub (primary) / Google (secondary)
- **MFA**: **Mandatory phishing-resistant MFA** for Superadmin — FIDO2/passkeys preferred, TOTP as fallback
- **Session management**:
  - Short-lived access tokens: 15 minutes
  - Refresh tokens: 7 days with rotation on each use
  - Session pinned to device fingerprint (user-agent + IP range)
  - Idle timeout: 30 minutes for admin panel
- **API access**: OAuth2 client credentials or signed JWTs with short lifetimes for machine-to-machine
- **JIT privilege escalation**: Destructive operations (delete project, modify alert rules, rotate secrets, server restart) require re-authentication within the current session

### 11.4 Gatekeeping Mechanisms

- **IP allowlisting** — Optional, for hardened admin access (configurable per role)
- **Rate limiting** — All API endpoints rate-limited; auth routes strictly limited (5 attempts / 15 min)
- **Audit logging** — Every config change, alert modification, deployment trigger, and data access logged with: actor, timestamp, IP, user-agent, action, target resource, diff (if applicable)
- **API key management** — Dashboard shows key age, last used, expiry. Enforced 90-day rotation cadence with email warnings at 14/7/1 days.
- **Secret handling** — All credentials stored in encrypted `Config_Entry` records. Values never logged, never returned in full via API. Masked display with "click to reveal" (logged as access event).
- **CORS** — Strict origin allowlist for API and embeddable widgets
- **CSP headers** — Content Security Policy preventing XSS on all dashboard pages
- **Webhook signature verification** — All incoming webhooks validated via HMAC-SHA256 signature

### 11.5 Public Status Page Security

The public status page at `status.dockyard.cc` (or embedded in portfolio) exposes:
- **Allowed**: Project name, up/down status, uptime percentage (last 90 days)
- **Blocked**: Internal metrics, error details, log content, config values, alert rules, deployment details

---

## 12. Automating Data Flow — Ingestion & Collection

### 12.1 Data Sources & Signal Types

| Source | Transport | Events Captured | Poll / Push |
|--------|-----------|-----------------|-------------|
| **GitHub** | Webhook (POST) | push, pull_request, issues, release, deployment_status, workflow_run | Push |
| **Dokploy** | API polling + webhook | Deploy status, container health, resource usage, env changes | Both |
| **Hetzner Cloud** | API polling | Server metrics (CPU, disk, network), billing, server status | Poll (60s) |
| **Project Health Endpoints** | HTTP polling | `/healthz`, `/readyz`, custom metrics | Poll (30s) |
| **Error Trackers** (Sentry, etc.) | Webhook | New issue, issue resolved, error spike | Push |
| **CI/CD** (GitHub Actions) | Webhook via `workflow_run` | Build pass/fail, test results, coverage | Push |
| **Synthetic Monitors** | Inngest cron | HTTP endpoint availability, response time, SSL validity | Poll (60s) |
| **Manual Input** | UI / API | Checkpoints, notes, blocker declarations, roadmap updates | Push |

### 12.2 Ingestion Pipeline

```
[External Sources] ──→ [Webhook Receiver / Poller]
                              │
                    ┌─────────▼──────────┐
                    │  Validation Layer   │
                    │  - Signature check  │
                    │  - Schema validate  │
                    │  - Rate limit       │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Normalization      │
                    │  - Map to Signal_   │
                    │    Event schema     │
                    │  - Enrich with      │
                    │    project context  │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Signal_Event Store │
                    │  (PostgreSQL)       │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Background Workers │
                    │  (Inngest)          │
                    │                     │
                    │  ┌─ Health Agg.     │
                    │  ├─ Alert Eval.     │
                    │  ├─ Metrics Calc.   │
                    │  ├─ Progress Agg.   │
                    │  └─ AI Generation   │
                    └─────────┬──────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
    [Dashboard State]  [Notifications]  [AI Snapshots]
    (SSE → UI)         (Slack/Email)    (Context Blocks)
```

### 12.3 Signal Aggregation Strategy

To prevent noise (the #1 pitfall identified in research):
- **Batching**: Minor signals (e.g., 5 commits in an hour) are aggregated into a single semantic event: "Active development: 5 commits touching auth module"
- **Deduplication**: Same alert/event within a configurable window (default 5 min) is deduplicated
- **Prioritization**: Events are scored by impact — deploy events and health changes rank above individual commits
- **Decay**: Old, unprocessed signals are auto-archived after 30 days

---

## 13. DockYard Integration Protocol (DIP) — Communication Standards for Tracked Projects

> **Purpose**: A lightweight, versioned protocol that any current or future project can implement to seamlessly integrate with DockYard's ingestion engine. Designed for forward compatibility, minimal overhead, and progressive adoption.

### 13.1 Design Principles

1. **Progressive Enhancement** — Projects work with DockYard at Level 0 (zero integration effort). Each higher level adds richer data exchange.
2. **API-First** — Contracts are defined before code. All interfaces use OpenAPI 3.1 specs.
3. **CloudEvents Envelope** — All events exchanged between projects and DockYard use the [CloudEvents v1.0 specification](https://cloudevents.io/) — the CNCF-graduated standard for event interoperability.
4. **Standard Webhooks** — Webhook delivery follows the [Standard Webhooks](https://www.standardwebhooks.com/) specification for security (HMAC-SHA256 signatures, timestamps, replay protection).
5. **Idempotent by Default** — Every event includes a unique `id`. Receivers handle duplicates gracefully.
6. **Versioned** — Protocol version is included in every exchange. DockYard supports N and N-1 simultaneously.

### 13.2 Integration Levels

#### Level 0 — Zero Effort (GitHub-only)
**Requirements from the project**: None. Just connect the GitHub repo to DockYard.
**What DockYard gets**: Commit activity, PR status, issue counts, release events, CI results via GitHub webhooks.
**What the project gets**: A project card in DockYard with basic progress tracking.

#### Level 1 — Health Check Endpoints
**Requirements from the project**: Implement two HTTP endpoints.

```
GET /healthz
Response (200 OK):
{
  "status": "ok" | "degraded" | "down",
  "version": "1.2.3",
  "uptime_seconds": 86400,
  "checks": {
    "database": { "status": "ok", "latency_ms": 12 },
    "cache": { "status": "ok", "latency_ms": 3 },
    "external_api": { "status": "degraded", "latency_ms": 1500, "message": "Slow response from payment provider" }
  }
}

GET /readyz
Response (200 OK):
{
  "ready": true
}
```

**What DockYard gets**: Component-level health monitoring, latency tracking, dependency visibility.
**What the project gets**: Watchtower health cards with component breakdown, automated alerting.

#### Level 2 — Metrics Endpoint
**Requirements from the project**: Expose a Prometheus-compatible metrics endpoint.

```
GET /metrics
Response (200 OK, text/plain):
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200"} 1234
http_requests_total{method="POST",status="500"} 7
# HELP http_request_duration_seconds HTTP request latency
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.1"} 800
http_request_duration_seconds_bucket{le="0.5"} 1100
http_request_duration_seconds_bucket{le="1.0"} 1200
```

**What DockYard gets**: Rich time-series data, SLO tracking, performance trending.
**What the project gets**: Grafana-style dashboards in Watchtower, burn-rate alerting, DORA metrics.

#### Level 3 — Event Emission (CloudEvents)
**Requirements from the project**: Emit structured events to DockYard's ingestion endpoint on significant occurrences.

```
POST https://api.dockyard.cc/ingest
Content-Type: application/cloudevents+json

{
  "specversion": "1.0",
  "id": "evt_a1b2c3d4",
  "source": "project-alpha.example.com",
  "type": "cc.dockyard.project.deployment.completed",
  "time": "2026-03-19T14:30:00Z",
  "datacontenttype": "application/json",
  "data": {
    "project_id": "project-alpha",
    "version": "2.1.0",
    "commit_sha": "abc123",
    "environment": "production",
    "duration_seconds": 45,
    "status": "success"
  }
}
```

**Standard event types** (namespace: `cc.dockyard.project.*`):
| Event Type | When to Emit |
|------------|-------------|
| `deployment.started` | Deploy process begins |
| `deployment.completed` | Deploy succeeds |
| `deployment.failed` | Deploy fails |
| `error.spike` | Error rate exceeds project-defined threshold |
| `performance.degraded` | Response times exceed baseline by >50% |
| `config.changed` | Environment or configuration modified |
| `test.completed` | Test suite run finishes |
| `milestone.reached` | A roadmap milestone is completed |

**What DockYard gets**: Real-time event stream with rich context, enabling instant alerts and timeline construction.
**What the project gets**: Fully automated progress tracking, deploy correlation, incident detection.

#### Level 4 — Bidirectional Control (Future)
**Requirements from the project**: Implement a DockYard control endpoint that accepts commands.

```
POST /dockyard/control
Authorization: Bearer <scoped-jwt>

{
  "command": "run_smoke_test" | "restart_service" | "apply_config",
  "params": { ... },
  "request_id": "req_xyz",
  "callback_url": "https://api.dockyard.cc/callback/req_xyz"
}
```

**What DockYard gets**: Ability to trigger remote actions (tests, restarts, config changes) from the dashboard.
**What the project gets**: Operational automation — smoke tests triggered post-deploy, auto-remediation.

### 13.3 Authentication Between Projects & DockYard

| Direction | Auth Method |
|-----------|-------------|
| DockYard → Project (health checks, control) | Bearer token (project-scoped, stored encrypted in DockYard) |
| Project → DockYard (event emission) | API key in `Authorization` header + HMAC-SHA256 signature in `X-Webhook-Signature` |
| DockYard → Dokploy | API key in `x-api-key` header (Dokploy's native auth) |
| DockYard → Hetzner | Bearer token (Hetzner Cloud API token) |

### 13.4 SDK / Helper Library (Future)

A lightweight npm package `@dockyard/client` that projects can install:

```typescript
import { DockYard } from '@dockyard/client';

const dy = new DockYard({
  projectId: 'project-alpha',
  apiKey: process.env.DOCKYARD_API_KEY,
  endpoint: 'https://api.dockyard.cc'
});

// Auto-registers /healthz and /readyz middleware
app.use(dy.healthMiddleware({
  checks: {
    database: () => db.ping(),
    redis: () => redis.ping(),
    openai: () => fetch('https://api.openai.com/v1/models').then(r => r.ok)
  }
}));

// Emit events
await dy.emit('deployment.completed', {
  version: '2.1.0',
  commit_sha: 'abc123',
  duration_seconds: 45
});

// Auto /metrics endpoint with common defaults
app.use(dy.metricsMiddleware());
```

### 13.5 Backward & Forward Compatibility

- **Protocol versioning**: Every request includes `X-DIP-Version: 1.0`. DockYard supports current and previous version simultaneously.
- **Graceful degradation**: If a project downgrades from Level 3 to Level 1, DockYard seamlessly reduces data richness without errors.
- **Schema evolution**: New fields are always additive. Existing fields are never removed or renamed within a major version.
- **Unknown event types**: DockYard stores unknown event types as raw `Signal_Event` records for future processing when support is added.

---

## 14. Dokploy API Integration Layer

### 14.1 Authentication
- **Method**: JWT token via `x-api-key` header
- **Generation**: Settings → Profile → API/CLI Section → Generate Token
- **Storage**: Encrypted in DockYard's secret store, never exposed to frontend

### 14.2 Key Endpoints Used by DockYard

#### Application Management
| DockYard Action | Dokploy Endpoint | Method |
|-----------------|------------------|--------|
| Get app details | `/application.one` | GET |
| Deploy app | `/application.deploy` | POST |
| Redeploy app | `/application.redeploy` | POST |
| Start app | `/application.start` | POST |
| Stop app | `/application.stop` | POST |
| Reload config | `/application.reload` | POST |
| Cancel deploy | `/application.cancelDeployment` | POST |
| Read metrics | `/application.readAppMonitoring` | GET |
| Update env vars | `/application.saveEnvironment` | POST |

#### Docker Compose Management
| DockYard Action | Dokploy Endpoint | Method |
|-----------------|------------------|--------|
| Get compose config | `/compose.one` | GET |
| Deploy compose | `/compose.deploy` | POST |
| Redeploy compose | `/compose.redeploy` | POST |
| Start services | `/compose.start` | POST |
| Stop services | `/compose.stop` | POST |
| Update compose | `/compose.update` | POST |
| List services | `/compose.loadServices` | GET |

#### Server & Monitoring
| DockYard Action | Dokploy Endpoint | Method |
|-----------------|------------------|--------|
| Server health | `/server.*` | GET |
| App stats | `/stats.*` | GET |
| Notifications | `/notification.*` | POST |

### 14.3 Config Update Flow (Detailed)

For a project like **Project Alpha** where the user wants to change the AI LLM provider:

```
1. User opens projects.dockyard.cc → Project Alpha → Config Panel
2. Under "AI Provider" section:
   - Selects "Anthropic" from provider dropdown
   - Pastes API key (masked after entry)
   - Selects "claude-sonnet-4-5-20250514" from model dropdown
3. Clicks "Apply & Restart"

4. DockYard backend:
   a. Validates inputs (API key format, model exists for provider)
   b. Optionally tests connection (quick API call to provider)
   c. Logs change to Config_Audit_Log:
      { old: { AI_PROVIDER: "openai", AI_MODEL: "gpt-4o" },
        new: { AI_PROVIDER: "anthropic", AI_MODEL: "claude-sonnet-4-5-20250514" },
        changed_by: "admin", changed_at: "2026-03-19T..." }
   d. Constructs env string:
      "AI_PROVIDER=anthropic\nAI_API_KEY=sk-ant-...\nAI_MODEL=claude-sonnet-4-5-20250514\n..."
   e. Calls POST /application.saveEnvironment
      { applicationId: "<project-alpha-app-id>", env: "<full env string>" }
   f. Calls POST /application.redeploy
      { applicationId: "<project-alpha-app-id>" }
   g. Monitors deployment status via polling /application.one
   h. Pushes status updates to UI via SSE:
      → "Saving environment variables..."
      → "Triggering redeploy..."
      → "Building... (container pulling)"
      → "Starting... (health check pending)"
      → "✅ Live — Project Alpha redeployed with Anthropic/Claude Sonnet"

5. If deploy fails:
   a. Alert triggered in Watchtower
   b. One-click rollback available (restores previous env from audit log)
   c. Automatic rollback option (configurable): if new deploy fails health check
      within 60s, auto-revert to previous env + redeploy
```

### 14.4 Dokploy MCP Server (Bonus)
Research revealed a **Dokploy MCP Server** exists (`lobehub.com/mcp/dokploy-mcp`), which means AI agents could directly interact with Dokploy through DockYard's AI context layer in the future — enabling agent-driven deployments with proper guardrails.

---

## 15. Hetzner Cloud API Integration Layer

### 15.1 Authentication
- **Method**: Bearer token via `Authorization: Bearer <token>` header
- **Generation**: Hetzner Cloud Console → Project → Security → API Tokens → Generate (Read-only for monitoring)
- **Base URL**: `https://api.hetzner.cloud/v1`

### 15.2 Key Endpoints Used by DockYard

#### Server Metrics
| DockYard Display | Hetzner Endpoint | Data Returned |
|------------------|------------------|---------------|
| CPU utilization | `GET /servers/{id}/metrics?type=cpu` | CPU % over time |
| Disk I/O | `GET /servers/{id}/metrics?type=disk` | IOPS read/write, bandwidth read/write |
| Network bandwidth | `GET /servers/{id}/metrics?type=network` | Bandwidth in/out, packets in/out |
| All metrics | `GET /servers/{id}/metrics?type=cpu,disk,network` | Combined |

**Query Parameters**:
- `start` / `end`: ISO 8601 timestamps for time range
- `step`: Resolution in seconds (minimum 60)

#### Server Information
| DockYard Display | Hetzner Endpoint | Data Returned |
|------------------|------------------|---------------|
| Server details | `GET /servers/{id}` | Name, status, server type, datacenter, IPs, image |
| Server status | `GET /servers/{id}` → `.status` | `running`, `off`, `starting`, etc. |
| All servers | `GET /servers` | List of all servers in project |

#### Resource Management
| DockYard Display | Hetzner Endpoint | Data Returned |
|------------------|------------------|---------------|
| Volumes | `GET /volumes` | Attached volumes, sizes, status |
| Floating IPs | `GET /floating_ips` | Assigned IPs, DNS PTR records |
| Load Balancers | `GET /load_balancers` | LB config, targets, health |
| LB metrics | `GET /load_balancers/{id}/metrics` | Connections, requests/s, bandwidth |
| Firewalls | `GET /firewalls` | Rules, applied-to resources |

#### Billing & Pricing
| DockYard Display | Hetzner Endpoint | Data Returned |
|------------------|------------------|---------------|
| Server pricing | `GET /pricing` | Per-hour and per-month rates for all server types |
| Current server cost | Calculated from `GET /servers/{id}` → server_type + `GET /pricing` | Monthly/hourly cost |
| Traffic pricing | `GET /pricing` → `.pricing.traffic` | Included traffic, overage per TB |

**Note**: Hetzner's Cloud API doesn't expose a direct "current month spend" endpoint. DockYard will **calculate billing** by:
1. Fetching active resources (servers, volumes, floating IPs, LBs)
2. Cross-referencing with pricing API
3. Multiplying by uptime duration this billing period
4. Tracking traffic via server metrics to estimate overage

#### Alternative: Grafana Hetzner Plugin
The `apricote/grafana-hcloud-datasource` Grafana plugin works directly with the Hetzner Cloud API without requiring Prometheus. DockYard can either:
- Embed Grafana panels via iframe (quick, powerful)
- Implement the same API calls natively in Next.js for a seamless UI (recommended)

### 15.3 Polling Strategy
| Metric Type | Poll Interval | Retention |
|-------------|---------------|-----------|
| Server metrics (CPU/disk/net) | 60 seconds | 30 days (TimescaleDB) |
| Server status | 60 seconds | Current only |
| Billing calculation | 6 hours | 12 months |
| Volume/IP/Firewall status | 5 minutes | Current only |

---

## 16. Tech Stack

### Core (retained from v1)
| Concern | Technology | Rationale |
|---------|-----------|-----------|
| **Frontend** | Next.js 15 (React 19, App Router) | SSR for admin, SSG/ISR for public portfolio, RSC for optimal payload |
| **Backend** | Next.js API Routes + Server Actions | Monolithic deployment, excellent DX |
| **Styling** | Tailwind CSS + Framer Motion | Modern aesthetic (glassmorphism, micro-animations) without perf cost |
| **Database** | PostgreSQL (via Drizzle ORM) | Relational structure for complex entity relationships |
| **Background Jobs** | Inngest | Event-driven, serverless-compatible, perfect for webhook processing + scheduled tasks |
| **AI Layer** | Vercel AI SDK | Multi-provider LLM integration, structured object generation |
| **Deployment** | Dokploy on Hetzner VPS | Self-hosted, full control, cost-effective |

### New Additions for Watchtower
| Concern | Technology | Rationale |
|---------|-----------|-----------|
| **Time-Series Storage** | TimescaleDB (Postgres extension) | No separate DB — extends existing Postgres for metrics with hypertables, compression, continuous aggregates |
| **Real-Time Push** | Server-Sent Events (SSE) | Simpler than WebSockets for one-way dashboard updates, works with Next.js, no extra infra |
| **Charts & Visualization** | Tremor (React charting library) | Built for dashboards, Tailwind-native, supports sparklines/area charts/bar charts |
| **Notifications** | Resend (email) + Slack webhooks + Web Push API | Lightweight, no external SaaS dependency for core alerting |
| **Log Aggregation** | Dokploy built-in logs via API (MVP) → Vector + Loki (Advanced) | Start simple, scale when needed |
| **Synthetic Monitoring** | Inngest scheduled functions | Reuse existing infra — cron-based HTTP checks every 30-60s |
| **Secrets** | Encrypted `Config_Entry` table (MVP) → Infisical (Advanced) | Start with DB-level encryption, upgrade to dedicated vault when warranted |

---

## 17. Database Schema

### Existing Entities (from v1, enhanced)

```
User
  id              UUID PRIMARY KEY
  email           TEXT UNIQUE
  name            TEXT
  role            ENUM (superadmin, project_admin, viewer)
  auth_provider   TEXT (github, google)
  auth_provider_id TEXT
  mfa_enabled     BOOLEAN DEFAULT false
  mfa_method      TEXT (fido2, totp)
  context_prefs   JSONB
  created_at      TIMESTAMPTZ
  updated_at      TIMESTAMPTZ

Project
  id              UUID PRIMARY KEY
  name            TEXT
  slug            TEXT UNIQUE
  description     TEXT
  status          ENUM (discovered, discovery, active, paused, completed, archived)
  current_phase   TEXT
  public_visible  BOOLEAN DEFAULT false
  dokploy_app_id  TEXT              -- Links to Dokploy application/compose
  dokploy_type    ENUM (application, compose)
  github_repo     TEXT
  local_path      TEXT              -- Absolute path on local filesystem (local mode only)
  tech_stack      TEXT[]
  icon_url        TEXT
  discovered_via  TEXT              -- 'filesystem', 'dokploy', 'github', 'manual'
  created_at      TIMESTAMPTZ
  updated_at      TIMESTAMPTZ

Discovery_Source
  id              UUID PRIMARY KEY
  type            ENUM (filesystem, dokploy, github, manual)
  name            TEXT              -- Human-friendly label (e.g., "~/projects", "Main Dokploy")
  config          JSONB             -- Type-specific: { path, recursive } | { instanceUrl, apiKey } | { org, token }
  enabled         BOOLEAN DEFAULT true
  last_scan_at    TIMESTAMPTZ
  last_scan_result JSONB            -- { found: 5, new: 1, removed: 0 }
  created_at      TIMESTAMPTZ
  updated_at      TIMESTAMPTZ

Platform_Settings
  id              UUID PRIMARY KEY DEFAULT 'singleton'
  operating_mode  ENUM (local, vps) DEFAULT 'local'
  auto_scan       BOOLEAN DEFAULT true
  scan_interval   INTEGER DEFAULT 300  -- seconds between periodic scans
  settings        JSONB              -- Extensible settings bag
  updated_at      TIMESTAMPTZ

Roadmap_Item
  id              UUID PRIMARY KEY
  project_id      UUID REFERENCES Project
  title           TEXT
  description     TEXT
  status          ENUM (planned, in_progress, completed, blocked)
  phase           TEXT
  estimated_at    TIMESTAMPTZ
  completed_at    TIMESTAMPTZ
  sequence_order  INTEGER
  blockers        JSONB             -- [{ description, severity, owner }]

Checkpoint
  id              UUID PRIMARY KEY
  project_id      UUID REFERENCES Project
  title           TEXT
  summary         TEXT
  type            ENUM (manual, automated)
  confidence      DECIMAL(3,2)      -- 0.00 to 1.00
  snapshot_date   TIMESTAMPTZ
  created_at      TIMESTAMPTZ

Signal_Event
  id              UUID PRIMARY KEY
  project_id      UUID REFERENCES Project
  source          TEXT              -- 'github', 'dokploy', 'hetzner', 'health_check', 'manual', etc.
  event_type      TEXT              -- CloudEvents type string
  raw_payload     JSONB
  processed       BOOLEAN DEFAULT false
  created_at      TIMESTAMPTZ

Note
  id              UUID PRIMARY KEY
  project_id      UUID REFERENCES Project
  content         TEXT
  is_private      BOOLEAN DEFAULT true
  author_id       UUID REFERENCES User
  created_at      TIMESTAMPTZ

AI_Context_Snapshot
  id              UUID PRIMARY KEY
  project_id      UUID REFERENCES Project
  payload         JSONB             -- Machine-readable context block
  format          TEXT DEFAULT 'json' -- json, markdown
  validation_hash TEXT
  generated_at    TIMESTAMPTZ
```

### New Entities for Watchtower & Config Management

```
Project_Health
  id              UUID PRIMARY KEY
  project_id      UUID REFERENCES Project (UNIQUE)
  overall_status  ENUM (healthy, degraded, down, maintenance, unknown)
  components      JSONB             -- { "api": { status, latency_ms }, "db": {...} }
  uptime_30d      DECIMAL(5,2)      -- Percentage
  last_checked_at TIMESTAMPTZ
  updated_at      TIMESTAMPTZ

Health_Check_Result (TimescaleDB hypertable)
  id              UUID
  project_id      UUID REFERENCES Project
  component       TEXT              -- 'api', 'database', 'cache', 'worker', etc.
  status          ENUM (ok, degraded, down)
  latency_ms      INTEGER
  response_code   INTEGER
  message         TEXT
  checked_at      TIMESTAMPTZ       -- Partition key

Metric_Point (TimescaleDB hypertable)
  project_id      UUID REFERENCES Project
  metric_name     TEXT              -- 'http_requests_total', 'error_rate', 'cpu_percent', etc.
  metric_value    DOUBLE PRECISION
  labels          JSONB             -- { "method": "GET", "status": "200" }
  recorded_at     TIMESTAMPTZ       -- Partition key

Alert_Rule
  id              UUID PRIMARY KEY
  project_id      UUID REFERENCES Project (nullable — null = global rule)
  name            TEXT
  metric          TEXT              -- Metric to evaluate
  operator        TEXT              -- '>', '<', '==', 'sustained_above', 'increases_by_pct'
  threshold       DOUBLE PRECISION
  duration_secs   INTEGER           -- Sustain duration before firing
  severity        ENUM (sev1, sev2, sev3, sev4)
  runbook_url     TEXT
  notification_channels TEXT[]      -- ['email', 'slack', 'push']
  enabled         BOOLEAN DEFAULT true
  cooldown_secs   INTEGER DEFAULT 300
  created_by      UUID REFERENCES User
  created_at      TIMESTAMPTZ
  updated_at      TIMESTAMPTZ

Alert_Event
  id              UUID PRIMARY KEY
  rule_id         UUID REFERENCES Alert_Rule
  project_id      UUID REFERENCES Project
  severity        ENUM (sev1, sev2, sev3, sev4)
  status          ENUM (firing, acknowledged, resolved, auto_resolved)
  message         TEXT
  context         JSONB             -- Snapshot of metrics at trigger time
  triggered_at    TIMESTAMPTZ
  acknowledged_at TIMESTAMPTZ
  acknowledged_by UUID REFERENCES User
  resolved_at     TIMESTAMPTZ
  resolved_by     UUID REFERENCES User
  escalation_lvl  INTEGER DEFAULT 0

Incident
  id              UUID PRIMARY KEY
  project_id      UUID REFERENCES Project
  title           TEXT
  severity        ENUM (sev1, sev2, sev3, sev4)
  status          ENUM (investigating, identified, monitoring, resolved, postmortem)
  timeline        JSONB             -- [{ timestamp, actor, action, note }]
  related_alerts  UUID[]            -- Alert_Event IDs
  related_deploys UUID[]            -- Deployment_Event IDs
  mttr_seconds    INTEGER           -- Calculated on resolution
  postmortem      TEXT              -- Markdown content
  created_at      TIMESTAMPTZ
  resolved_at     TIMESTAMPTZ

Config_Entry
  id              UUID PRIMARY KEY
  project_id      UUID REFERENCES Project
  key             TEXT
  value_encrypted BYTEA             -- AES-256-GCM encrypted
  environment     TEXT DEFAULT 'production'
  is_secret       BOOLEAN DEFAULT false
  category        TEXT              -- 'ai_provider', 'database', 'general', etc.
  display_name    TEXT              -- Human-friendly name for UI
  description     TEXT              -- Help text shown in config panel
  input_type      TEXT DEFAULT 'text' -- 'text', 'select', 'password', 'number', 'slider'
  input_options   JSONB             -- For select: [{ label, value }], for slider: { min, max, step }
  updated_by      UUID REFERENCES User
  updated_at      TIMESTAMPTZ

Config_Audit_Log
  id              UUID PRIMARY KEY
  config_entry_id UUID REFERENCES Config_Entry
  project_id      UUID REFERENCES Project
  old_value_hash  TEXT              -- SHA-256 hash (never store old plaintext)
  new_value_hash  TEXT
  changed_by      UUID REFERENCES User
  changed_at      TIMESTAMPTZ
  change_reason   TEXT              -- Optional note
  rollback_of     UUID              -- Self-reference if this was a rollback

Deployment_Event
  id              UUID PRIMARY KEY
  project_id      UUID REFERENCES Project
  version         TEXT
  commit_sha      TEXT
  commit_message  TEXT
  environment     TEXT DEFAULT 'production'
  status          ENUM (pending, building, deploying, success, failed, rolled_back)
  triggered_by    TEXT              -- 'user:<id>', 'webhook', 'auto_rollback', 'schedule'
  duration_secs   INTEGER
  dokploy_deploy_id TEXT
  deployed_at     TIMESTAMPTZ
  completed_at    TIMESTAMPTZ

SLO_Budget
  id              UUID PRIMARY KEY
  project_id      UUID REFERENCES Project
  metric_name     TEXT              -- 'availability', 'latency_p99', 'error_rate'
  target_value    DOUBLE PRECISION  -- e.g., 99.9 for 99.9% availability
  window_days     INTEGER DEFAULT 30
  current_value   DOUBLE PRECISION  -- Current measured value
  budget_remaining DOUBLE PRECISION -- Remaining error budget as percentage
  burn_rate       DOUBLE PRECISION  -- Current consumption rate (1.0 = normal)
  updated_at      TIMESTAMPTZ

Test_Run
  id              UUID PRIMARY KEY
  project_id      UUID REFERENCES Project
  type            ENUM (smoke, integration, load, health_check, custom)
  status          ENUM (pending, running, passed, failed, error)
  triggered_by    UUID REFERENCES User (nullable — null = automated)
  trigger_reason  TEXT              -- 'manual', 'post_deploy', 'scheduled', 'alert_response'
  results         JSONB             -- { passed: 12, failed: 1, skipped: 2, details: [...] }
  duration_secs   INTEGER
  started_at      TIMESTAMPTZ
  completed_at    TIMESTAMPTZ

Test_Config
  id              UUID PRIMARY KEY
  project_id      UUID REFERENCES Project
  type            ENUM (smoke, integration, load, health_check, custom)
  name            TEXT
  config          JSONB             -- Type-specific config (endpoints, commands, thresholds, etc.)
  schedule_cron   TEXT              -- Cron expression for scheduled runs (null = manual only)
  run_post_deploy BOOLEAN DEFAULT false
  enabled         BOOLEAN DEFAULT true
  created_at      TIMESTAMPTZ
  updated_at      TIMESTAMPTZ

Hetzner_Snapshot (TimescaleDB hypertable)
  server_id       TEXT
  metric_type     TEXT              -- 'cpu', 'disk_iops_read', 'disk_iops_write', 'network_in', 'network_out'
  value           DOUBLE PRECISION
  recorded_at     TIMESTAMPTZ       -- Partition key

Billing_Estimate
  id              UUID PRIMARY KEY
  period_start    DATE
  period_end      DATE
  server_cost     DECIMAL(10,2)
  volume_cost     DECIMAL(10,2)
  ip_cost         DECIMAL(10,2)
  lb_cost         DECIMAL(10,2)
  traffic_cost    DECIMAL(10,2)
  total_cost      DECIMAL(10,2)
  currency        TEXT DEFAULT 'EUR'
  calculated_at   TIMESTAMPTZ

Notification_Channel
  id              UUID PRIMARY KEY
  type            ENUM (email, slack, push, webhook)
  name            TEXT
  config          JSONB             -- { "webhook_url": "...", "email": "...", etc. }
  enabled         BOOLEAN DEFAULT true
  created_by      UUID REFERENCES User
  created_at      TIMESTAMPTZ
```

### Data Retention Policy (TimescaleDB Compression)

| Table | Raw Retention | Compressed Retention | Aggregation |
|-------|---------------|----------------------|-------------|
| Health_Check_Result | 7 days | 90 days | 1-min → 5-min → 1-hour rollups |
| Metric_Point | 7 days | 90 days | Same as above |
| Hetzner_Snapshot | 7 days | 180 days | 1-min → 1-hour rollups |
| Signal_Event | 30 days | 365 days | None (event data) |
| Alert_Event | Forever | - | None |
| Config_Audit_Log | Forever | - | None |

---

## 18. Architecture & Component Design

### Module Breakdown

```
src/
├── app/                          # Next.js App Router
│   ├── (home)/                   # dockyard.cc routes
│   │   ├── page.tsx              # Home dashboard
│   │   └── settings/
│   ├── (projects)/               # projects.dockyard.cc routes
│   │   ├── page.tsx              # Project listing / portfolio
│   │   └── [slug]/
│   │       ├── page.tsx          # Project detail
│   │       ├── config/           # Config panel
│   │       └── roadmap/
│   ├── (watchtower)/             # watchtower.dockyard.cc routes
│   │   ├── page.tsx              # Health overview grid
│   │   ├── [slug]/
│   │   │   ├── page.tsx          # Project health detail
│   │   │   ├── tests/            # Test runner
│   │   │   └── logs/
│   │   ├── incidents/
│   │   └── alerts/
│   └── api/                      # API routes
│       ├── ingest/               # Webhook receiver (CloudEvents)
│       ├── discovery/            # Project discovery & scan endpoints
│       ├── settings/             # Platform settings & integrations
│       ├── dokploy/              # Dokploy API proxy
│       ├── hetzner/              # Hetzner API proxy
│       ├── health/               # Internal health endpoints
│       ├── projects/
│       ├── config/
│       ├── alerts/
│       └── tests/
├── lib/
│   ├── discovery/                # Project discovery engine
│   │   ├── types.ts              # DiscoverySource, DiscoveredProject interfaces
│   │   ├── scanner.ts            # Orchestrator: runs all sources, merges, deduplicates
│   │   ├── sources/
│   │   │   ├── filesystem.ts     # Local dir scanning (package.json, .git, Dockerfile)
│   │   │   ├── dokploy.ts        # Dokploy API: list apps & compose services
│   │   │   ├── github.ts         # GitHub API: list repos from connected account/org
│   │   │   └── manual.ts         # Manual project registrations from settings
│   │   └── indicators.ts         # Project indicator detection logic
│   ├── ingestion/                # Signal normalization, validation
│   ├── dokploy/                  # Dokploy API client
│   ├── hetzner/                  # Hetzner Cloud API client
│   ├── alerts/                   # Alert evaluation engine
│   ├── health/                   # Health check poller
│   ├── metrics/                  # Metrics collection & aggregation
│   ├── ai/                       # AI generation (summaries, context blocks)
│   ├── auth/                     # Auth middleware, RBAC
│   ├── crypto/                   # Encryption/decryption for config values
│   └── notifications/            # Notification dispatch (email, slack, push)
├── inngest/
│   ├── functions/
│   │   ├── project-scanner.ts    # Periodic project discovery re-scan
│   │   ├── health-check.ts       # Scheduled health polling
│   │   ├── hetzner-metrics.ts    # Scheduled Hetzner metric collection
│   │   ├── alert-evaluator.ts    # Processes metrics against alert rules
│   │   ├── signal-processor.ts   # Processes queued Signal_Events
│   │   ├── billing-calculator.ts # Periodic billing estimation
│   │   ├── test-runner.ts        # Executes remote test suites
│   │   ├── ai-summary.ts        # Generates AI summaries/snapshots
│   │   └── confidence-scorer.ts  # Recalculates project confidence scores
│   └── client.ts
├── components/
│   ├── dashboard/                # Home dashboard widgets
│   ├── projects/                 # Project cards, detail views
│   ├── watchtower/               # Health cards, metric charts
│   ├── config/                   # Config panel, env editor
│   ├── alerts/                   # Alert rule builder, incident timeline
│   └── shared/                   # Status badges, sparklines, modals
└── db/
    ├── schema.ts                 # Drizzle schema definitions
    ├── migrations/
    └── seed.ts
```

### Key Design Boundaries

1. **Discovery Engine** — Pluggable source architecture. Each discovery source (filesystem, Dokploy, GitHub, manual) implements a common `DiscoverySource` interface. Core scanner orchestrates, merges, and deduplicates. Filesystem access is restricted to configured paths only.
2. **Frontend Core** — Communicates strictly via API routes / Server Actions. Never calls Dokploy or Hetzner directly.
3. **API Layer** — All external calls proxied through DockYard's API. Enforces auth, rate limiting, audit logging.
4. **Ingestion Engine** — Receives webhooks, validates signatures, normalizes to `Signal_Event`, queues background processing.
5. **Background Workers (Inngest)** — Asynchronous processing of signal events, health checks, alert evaluation, AI generation, project discovery scanning. Never blocks the UI.
6. **Data Access Layer (Drizzle)** — Single source of truth for all DB operations. Manages migrations, encryption, query optimization.
7. **Notification Dispatch** — Receives alert events from workers, routes to configured channels based on severity and user preferences.

---

## 19. Phased Rollout — MVP → Advanced → Future

### Phase 1: MVP (Watchtower v1) — "See Everything"

**Goal**: A working dashboard that shows what's happening across all projects.

**Project Discovery & Settings:**
- [ ] Operating mode detection (local vs. VPS) based on environment config
- [ ] Local mode: Filesystem scanner — scan sibling/configured directories for project indicators
- [ ] VPS mode: Dokploy API discovery — list all applications and compose services
- [ ] GitHub integration — connect account/org, list repos, link to projects
- [ ] Settings UI: Project discovery tab (accept/ignore/configure discovered projects)
- [ ] Settings UI: Directory picker for configuring additional scan paths (local mode)
- [ ] Settings UI: Integration management (GitHub OAuth, Dokploy API key)
- [ ] `.dockyard.json` support for project-level metadata overrides
- [ ] Inngest background job: periodic re-scan for new/removed projects

**Home Dashboard:**
- [ ] VPS metrics display (CPU, memory, disk, network) via Hetzner API
- [ ] Server status card (uptime, IP, server type)
- [ ] Basic billing estimate (calculated from resources + pricing API)
- [ ] Urgent alerts strip (deploy failures, projects down)

**Projects Portal:**
- [ ] Project CRUD with lifecycle states (including new "Discovered" state)
- [ ] Project cards with status badges and activity indicators
- [ ] Basic project detail: description, roadmap items, notes
- [ ] GitHub webhook ingestion (commits, PRs, issues)
- [ ] Public portfolio mode (read-only filtered view)
- [ ] Config Panel MVP: Environment variable editor + Apply & Restart via Dokploy API

**Watchtower:**
- [ ] Health check polling (Level 1 DIP — `/healthz` + `/readyz`)
- [ ] Per-project health cards (status, uptime, latency)
- [ ] Basic alert rules (up/down, deploy failed) with Slack/email notification
- [ ] Deployment event tracking from Dokploy
- [ ] Critical logs viewer (Dokploy log API)

**Auth:**
- [ ] GitHub OAuth SSO
- [ ] Superadmin + Viewer roles
- [ ] API key generation for machine access

### Phase 2: Advanced (Watchtower v2) — "Act on Everything"

**Goal**: Proactive alerting, rich config management, testing, and AI-powered insights.

**Home Dashboard:**
- [ ] Hetzner billing history (6-month trend)
- [ ] Traffic monitoring with overage alerts
- [ ] Quick actions (one-click redeploy, quick env update)

**Projects Portal:**
- [ ] Confidence scoring based on velocity + roadmap remaining
- [ ] AI-generated weekly summaries and milestone wrap-ups
- [ ] Context handoff block generation for AI agents
- [ ] Phase timeline visualization (achieved + planned)
- [ ] Blocker tracking with severity
- [ ] Config templates (dev/staging/prod profiles)
- [ ] Config categories with rich input types (dropdowns, sliders for AI params)
- [ ] Auto-rollback on failed deploy after config change

**Watchtower:**
- [ ] SLO-based burn-rate alerting
- [ ] Component-level health breakdown
- [ ] DORA metrics calculation (deploy frequency, lead time, MTTR, change failure rate)
- [ ] Alert grouping, deduplication, and runbook linking
- [ ] Incident management (timeline, post-mortems)
- [ ] Remote smoke test runner (configurable endpoints + expected responses)
- [ ] Deployment diff and one-click rollback
- [ ] Metric_Point ingestion (Level 2 DIP — Prometheus format)

**Auth:**
- [ ] MFA for superadmin (FIDO2 + TOTP)
- [ ] Project Admin role with scoped permissions
- [ ] Audit logging for all mutations
- [ ] JIT re-authentication for destructive actions

**Protocol:**
- [ ] CloudEvents ingestion endpoint (Level 3 DIP)
- [ ] Standard Webhooks signature verification
- [ ] `@dockyard/client` npm package (health middleware + event emission)

### Phase 3: Future Scope (Watchtower v3) — "Automate Everything"

- [ ] AI-powered anomaly detection on metrics (baseline learning + deviation alerting)
- [ ] Agent-triggered remediation (auto-scale, restart, rollback via Level 4 DIP)
- [ ] Dependency graph visualization with cascading failure prediction
- [ ] Multi-server support (manage multiple Hetzner VPS instances)
- [ ] Public status page at `status.dockyard.cc`
- [ ] Integration test runner (execute project test suites remotely)
- [ ] Load testing from dashboard
- [ ] Embedded Grafana panels (optional) for power users
- [ ] Change detection: AI identifies scope creep or architectural drift
- [ ] Predictive failure analysis based on metric trends
- [ ] Multi-persona tracking (different dashboard views for different stakeholders)
- [ ] Embeddable Web Components / NPM package for portfolio integration
- [ ] Dokploy MCP integration for AI agent-driven operations
- [ ] Mobile-responsive admin view or PWA

---

## 20. Pitfalls & Mitigations

### Over-Automation (Noise vs. Signal)
- **Pitfall**: Every commit becomes a checkpoint, every minor metric fluctuation becomes an alert.
- **Mitigation**: Batched signal aggregation (5 commits → 1 event). Alert quality enforcement (weekly review cadence, noise scoring). Burn-rate alerting instead of threshold-based.

### Incorrect Progress Inference & AI Hallucinations
- **Pitfall**: AI predicts 90% done based on closed issues, ignoring architectural blockers.
- **Mitigation**: Manual checkpoints always override. Confidence score decays without human input. AI summaries are flagged as "AI-generated" and editable.

### Config Panel as Attack Surface
- **Pitfall**: A compromised DockYard admin could modify env vars to inject malicious config into production projects.
- **Mitigation**: JIT re-auth for config changes. Config audit trail with alerting on unexpected changes. Mandatory diff review before apply. Optional approval workflow for critical vars.

### Dokploy API Dependency
- **Pitfall**: If Dokploy's API changes or breaks, DockYard's config/deploy features fail.
- **Mitigation**: Wrap all Dokploy calls in a versioned client library with fallback error handling. Cache last-known-good state. DockYard degrades gracefully to a read-only tracker if Dokploy is unreachable.

### Hetzner API Rate Limits
- **Pitfall**: Polling too frequently hits rate limits (3,600 requests/hour per token).
- **Mitigation**: 60-second poll intervals with jitter. Cache responses. Use conditional requests (ETags) where supported.

### Maintenance Overhead
- **Pitfall**: Running a monitoring system for monitoring systems — turtles all the way down.
- **Mitigation**: DockYard itself is a Dokploy compose project on the same VPS. Its health is self-monitored via a separate lightweight uptime check (Uptime Kuma or external ping service). Inngest handles background jobs without custom cron infrastructure.

### Scope Creep Into Enterprise Territory
- **Pitfall**: Building Grafana + PagerDuty + Backstage + Vercel Dashboard from scratch.
- **Mitigation**: Stay focused on the intersection no existing tool covers. Use existing tools where they're better (don't rebuild Grafana). Level-based progressive integration (DIP) prevents over-engineering integrations.

---

## 21. Open Questions & Assumptions

### Assumptions
- **Primary deploy platform**: Dokploy (Docker Compose-based deployments on Hetzner VPS)
- **Primary code host**: GitHub (webhooks and OAuth)
- **Single VPS initially**: One Hetzner server running all projects. Multi-server support is Phase 3.
- **AI Context Snapshots** consumed via clipboard-copy, API fetch, or MCP by IDE agents (Cursor, Claude Code, Copilot)
- **Superadmin is the primary user** — DockYard is built for the solo developer / tiny team use case first

### Open Questions
1. **Memory/CPU overhead**: Can DockYard run on the same Hetzner VPS as all the tracked projects without meaningful resource impact? (Target: <200MB RAM, <5% CPU for DockYard itself)
2. **Dokploy API stability**: Is the API considered stable, or should we expect breaking changes? Need to pin to a Dokploy version and test upgrades.
3. **Log aggregation strategy**: Should MVP use Dokploy's built-in log API (limited but zero-config) or set up Vector + Loki from day one? Recommendation: start with Dokploy logs, graduate to Loki when log volume justifies it.
4. **Hetzner billing accuracy**: Without a direct billing API, calculated estimates may drift from actual invoices. Acceptable for MVP? Should we build an invoice upload/reconciliation feature?
5. **Config panel scope**: Should DockYard manage *all* env vars for a project, or only a curated subset that the project explicitly exposes? Recommendation: curated subset via `Config_Entry` metadata, with an "Advanced" toggle to view/edit the full raw env string.
6. **Public portfolio vs. operational tool**: Should these truly share a codebase, or should the portfolio be a separate static site consuming DockYard's API? Recommendation: same codebase initially (simpler), split later if performance or design constraints warrant it.
7. **Alert notification fatigue for solo dev**: With only one person receiving alerts, how do we prevent burnout? Consider: business hours mode, weekly digest instead of per-event, smart grouping.

---

## 22. Research Sources

### Observability & Dashboard Best Practices
- [Observability Best Practices 2026 — Spacelift](https://spacelift.io/blog/observability-best-practices)
- [Operations Dashboard Examples 2026 — FlyDash](https://flydash.io/blogs/operations-dashboard-examples)
- [DevOps Monitoring & Observability 2026 — Vettedoutsource](https://vettedoutsource.com/blog/devops-monitoring-observability/)
- [DevOps Metrics to Monitor 2026 — Middleware](https://middleware.io/blog/devops-metrics-you-should-be-monitoring/)
- [UX Strategies for Real-Time Dashboards — Smashing Magazine](https://www.smashingmagazine.com/2025/09/ux-strategies-real-time-dashboards/)
- [DevOps Monitoring Dashboard Templates 2026 — AdminLTE](https://adminlte.io/blog/devops-monitoring-dashboard-templates/)

### Incident Management & Alerting
- [Incident Management Best Practices 2026 — incident.io](https://incident.io/blog/incident-management-best-practices-2026)
- [Monitoring & Alerting Best Practices — OneUptime](https://oneuptime.com/blog/post/2026-02-20-monitoring-alerting-best-practices/view)
- [IT Alerting Guide — Atlassian](https://www.atlassian.com/incident-management/on-call/it-alerting)
- [DevOps Alert Management Strategies — Hyperping](https://hyperping.com/blog/devops-alert-management)

### Security & Access Control
- [RBAC Best Practices 2026 — TechPrescient](https://www.techprescient.com/blogs/role-based-access-control-best-practices/)
- [RBAC Comprehensive Guide — Zluri](https://www.zluri.com/blog/role-based-access-control)
- [Zero Trust Security Architecture 2026 — Gurkha Technology](https://gurkhatech.com/zero-trust-security-architecture-2026/)
- [MFA & Zero Trust — ZeroTrustExplained](https://zerotrustexplained.com/mfa-best-practices-zero-trust)

### Platform Engineering & IDPs
- [IDP 2026 Complete Guide — Calmops](https://calmops.com/devops/internal-developer-platform-idp-2026-complete-guide/)
- [Platform Engineering Stack 2026 — Elest](https://blog.elest.io/the-2026-platform-engineering-stack-what-open-source-tools-companies-are-actually-running/)
- [Best Platform Engineering Tools 2026 — Infisical](https://infisical.com/blog/best-platform-engineering-tools-2026)

### CI/CD & Automation
- [CI/CD Pipelines 2026 Guide — Calmops](https://calmops.com/devops/cicd-pipelines-2026/)
- [CI/CD Automation Using Webhooks — Netlify](https://www.netlify.com/blog/guide-to-ci-cd-automation-using-webhooks/)
- [CI/CD Pipeline Monitoring — Splunk](https://www.splunk.com/en_us/blog/learn/monitoring-ci-cd.html)

### Protocols & Standards
- [CloudEvents Specification — CNCF](https://cloudevents.io/)
- [CloudEvents HTTP Webhook Spec — GitHub](https://github.com/cloudevents/spec/blob/main/cloudevents/http-webhook.md)
- [API Gateway Framework 2026 Guide — DigitalAPI](https://www.digitalapi.ai/blogs/api-gateway-framework-the-complete-2026-guide-for-modern-microservices)
- [Webhook Security Best Practices — Kusari](https://www.kusari.dev/learning-center/webhook-security)

### Dokploy & Infrastructure
- [Dokploy API Reference](https://docs.dokploy.com/docs/api)
- [Dokploy Application API](https://docs.dokploy.com/docs/api/reference-application)
- [Dokploy Compose API](https://docs.dokploy.com/docs/api/reference-compose)
- [Dokploy Environment Variables](https://docs.dokploy.com/docs/core/variables)
- [Dokploy MCP Server — LobeHub](https://lobehub.com/mcp/dokploy-mcp)

### Hetzner Cloud
- [Hetzner Cloud API Docs](https://docs.hetzner.cloud/)
- [Hetzner Cloud Grafana Plugin](https://grafana.com/grafana/plugins/apricote-hcloud-datasource/)
- [Hetzner Cloud Grafana Dashboard](https://grafana.com/grafana/dashboards/16169-hetzner-cloud-servers/)

### Competitive Analysis
- [Coolify vs Dokploy 2026 — Contabo](https://contabo.com/blog/blog-coolify-vs-dokploy-comparison/)
- [Self-Hosted Deployment Tools Compared — DEV Community](https://dev.to/ameistad/self-hosted-deployment-tools-compared-coolify-dokploy-kamal-dokku-and-haloy-2npd)
- [Best Self-Hosted Deployment Platforms 2026 — ServerCompass](https://servercompass.app/blog/best-self-hosted-deployment-platforms-2026)
- [Open Source Monitoring Tools 2026 — OpenObserve](https://openobserve.ai/blog/top-10-open-source-monitoring-tools/)
- [Open Source Dashboards 2026 — MetricFire](https://www.metricfire.com/blog/top-8-open-source-dashboards/)

### Community & Validation
- [Server Health Monitoring Checklist 2026 — Motadata](https://www.motadata.com/blog/server-monitoring-checklist/)
- [Self-Hosted Dashboard Replaced Monitoring Setup — MakeUseOf](https://www.makeuseof.com/self-hosted-dashboard-replaced-three-monitoring-apps-used-every-day/)
- [Microservices Health Check Pattern — microservices.io](https://microservices.io/patterns/observability/health-check-api.html)
- [Personal Dashboards — awesome-selfhosted](https://awesome-selfhosted.net/tags/personal-dashboards.html)
- [r/selfhosted — Reddit](https://www.reddit.com/r/selfhosted/) (650K+ weekly visitors)
