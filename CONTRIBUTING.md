# Contributing to DockYard

Thank you for your interest in contributing to DockYard! This guide will help you get set up and understand the project architecture.

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/your-org/dockyard.git
cd dockyard
npm install

# 2. Start the database
docker compose up -d

# 3. Set up environment
cp .env.example .env.local

# 4. Push schema and seed data
npm run db:push
npm run db:seed

# 5. Start development
npm run dev        # http://localhost:3000
```

## Architecture Overview

DockYard is a Next.js 15 monolith organized around two services:

- **DockYard** (Management Plane) — Project discovery, tracking, config management
- **Watchtower** (Observation Plane) — Health monitoring, alerting, incidents

See [Architecture.md](ARCHITECTURE.md) for full details.

## Project Structure

```
src/
├── app/           → Next.js App Router (routes, API endpoints)
├── lib/           → Service layer (business logic, adapters)
│   ├── providers/ → Abstract interfaces (DeployProvider, InfraProvider)
│   ├── discovery/ → Project discovery engine
│   ├── notifications/ → Notification channel adapters
│   └── auth/      → Authentication and RBAC
├── components/    → React components (presentational)
├── db/            → Drizzle ORM schema, migrations, seed
└── inngest/       → Background job definitions
```

## Adding a New Provider Adapter

Provider adapters let DockYard work with different infrastructure platforms.

1. **Implement the interface** from `src/lib/providers/types.ts`:
   - `DeployProvider` for deployment platforms (like Dokploy, Coolify)
   - `InfraProvider` for cloud providers (like Hetzner, DigitalOcean)

2. **Create your adapter** in `src/lib/<provider-name>/client.ts`

3. **Add a README** in `src/lib/<provider-name>/README.md`

Example: See `src/lib/dokploy/client.ts` for a `DeployProvider` implementation.

## Adding a Discovery Source

Discovery sources let DockYard find projects from different systems.

1. **Implement `DiscoverySource`** from `src/lib/discovery/types.ts`
2. **Create your source** in `src/lib/discovery/sources/<name>.ts`
3. **Register it** in the scanner: call `registerSource()` in the API route

Example: See `src/lib/discovery/sources/filesystem.ts`.

## Code Standards

- **TypeScript strict mode** — No `any` types
- **Files under 400 lines** — One responsibility per file
- **No `console.log`** — Use `console.warn`/`console.error` for legitimate warnings
- **Service layer pattern** — Business logic in `src/lib/`, not in routes or components
- **JSDoc on all exports** — Public functions, types, and components get documentation

## Scripts

```bash
npm run dev            # Development server
npm run build          # Production build
npm run lint           # ESLint
npm run format         # Prettier auto-fix
npm run typecheck      # TypeScript strict check
npm run db:push        # Push schema to database
npm run db:seed        # Seed development data
```

## Git Workflow

- Never commit directly to `main`
- Create feature branches: `feat/description`, `fix/description`
- Commit messages: `type(scope): description`
  - Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`
- One logical change per commit
