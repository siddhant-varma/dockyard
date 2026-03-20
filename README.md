# DockYard

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)

Open-source, self-hosted operations platform — project discovery, tracking, config management, and health monitoring for containerized deployments.

## What is DockYard?

DockYard is organized around **two major services** to give a single view for keeping track of all your projects with an integrated access for monitoring health of these projects, as well.

**DockYard** (Management Plane) — Keeps track of all your projects and controls them.
- **Project Discovery** — Automatically finds your projects. In local dev, scans sibling directories for project indicators (`package.json`, `.git/`, `Dockerfile`). On VPS, discovers projects via Dokploy API and GitHub integration.
- **Home Dashboard** (`dockyard.cc`) — VPS health, Hetzner metrics, billing, urgent alerts, global settings
- **Projects Portal** (`projects.dockyard.cc`) — Roadmap tracking, config management, public portfolio

**Watchtower** (Observation Plane) — Monitoring and alerting system for all tracked projects.
- **Watchtower** (`watchtower.dockyard.cc`) — Health monitoring, alerting, logs, remote test runner, incident management

## Architecture

```
┌─────────────────────────────────────────────────┐
│               Next.js 15 Application            │
│                                                 │
│  ┌─ DockYard ──────────┐  ┌─ Watchtower ──────┐ │
│  │  Home    Projects   │  │  Health   Alerts  │ │
│  └──────────┬──────────┘  └─────────┬─────────┘ │
│             └──────────┬────────────┘           │
│                ┌───────▼────────┐               │
│                │  Service Layer │               │
│                │  (src/lib/)    │               │
│                └───────┬────────┘               │
│                ┌───────▼────────┐               │
│                │  PostgreSQL +  │               │
│                │  TimescaleDB   │               │
│                └────────────────┘               │
└─────────────────────────────────────────────────┘
       │            │            │           │
  Hetzner API   Dokploy API   GitHub    Filesystem
```

## How It Works

DockYard runs in one of two modes:

| | Local Dev (`localhost`) | VPS / Deployed |
|-|------------------------|----------------|
| **Discovery** | Scans sibling directories for projects | Queries Dokploy API + GitHub |
| **Health** | Probes `localhost` ports | Polls HTTP(S) endpoints |
| **Config** | Read-only | Full env var management via Dokploy |
| **For** | Developers running `npm run dev` | Operators managing containers |

## Tech Stack

- **Next.js 15** (React 19, App Router, RSC)
- **PostgreSQL + TimescaleDB** (via Drizzle ORM)
- **Inngest** (background jobs)
- **Tailwind CSS v4 + Tremor** (UI + charts)
- **Auth.js v5** (GitHub OAuth + RBAC)
- **Dokploy API + Hetzner Cloud API** (infrastructure integration)

## Getting Started

```bash
# 1. Clone and install
git clone https://github.com/your-org/dockyard.git
cd dockyard
npm install

# 2. Start the database
docker compose up -d

# 3. Set up environment
cp .env.example .env.local
# Edit .env.local with your GitHub OAuth credentials

# 4. Push schema and seed data
npm run db:push
npm run db:seed

# 5. Start development
npm run dev        # http://localhost:3000
```

## Scripts

```bash
npm run dev            # Next.js dev server
npm run build          # Production build
npm run lint           # ESLint
npm run typecheck      # TypeScript strict check
npm run format         # Prettier auto-fix
npm test               # Run tests (Vitest)
npm run db:push        # Push schema to database
npm run db:seed        # Seed development data
```

## Documentation

- [Roadmap](Roadmap.md) — Full system design & phased rollout plan
- [Architecture](ARCHITECTURE.md) — System topology, operating modes, data flows
- [Components](COMPONENTS.md) — Service inventory & API endpoints
- [DockYard JSON](DOCKYARD-JSON.md) — `.dockyard.json` schema reference
- [Contributing](CONTRIBUTING.md) — Setup, architecture overview, how to add adapters
- [Dev Guidelines](Dev-Guidelines.md) — Coding standards

## License

[MIT](LICENSE) - DockYard Contributors
