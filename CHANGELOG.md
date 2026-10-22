# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Production pulls the CI-built image from GHCR instead of building on the server. CI triggers the deploy after publishing, waits for it and health-checks it; a manual `Rollback` workflow re-points `:latest` to an earlier build.

### Fixed

- Schema push on startup works in the production image (BUG-024): `drizzle-kit` now ships with its full dependency tree in `/app/migrate`. Before this it failed on every deploy (`Cannot find module 'esbuild'`). `schema.ts` now matches production: `audit_logs.actor_id` is nullable text (the credentials admin has a non-UUID ID), and the audit, MFA and revoked-session indexes are declared so the push keeps them.
- A failed startup schema push is reported by the deep health `schema` check. It is never a container healthcheck failure, which would take the app out of routing.

### Security

- Dev tooling: `npm audit` reports 0 high/critical (was 8 high from braces ≤3.0.3, no upstream fix). The shadcn CLI is no longer a devDependency (use `npx shadcn@4.21.5`; theme CSS vendored) and `@next/eslint-plugin-next` uses `tinyglobby` instead of `fast-glob` via `overrides` (BUG-007).
- Production compose defaults `DOCKYARD_AUTH_ENABLED` to `true`; dev compose requires `POSTGRES_PASSWORD`.
- Middleware returns 401 for unauthenticated `/api/*` calls (self-authenticating routes and `GET /api/projects` exempt).
- `/api/health/deep` monitor token moved from `?token=` to `Authorization: Bearer` (constant-time compare); error responses no longer list check slugs.
- CSP and HSTS are always sent; `unsafe-eval` only in development.
- `robots.txt` disallows all crawlers.
- Hardcoded Kuma credentials removed from `scripts/kuma-provision.mjs` and `CLAUDE.md` (rotated); gitleaks added to pre-commit and CI with custom Kuma-key and password rules.
- Patched critical advisories in `next` and `next-auth`; CI audit fails on high runtime or any critical advisory.

### Added

- Optional GlitchTip/Sentry error tracking (`GLITCHTIP_DSN`, `src/instrumentation.ts`).
- Middleware API-gate and dashboard cookie-forwarding tests; e2e suite green against a production build.

### Fixed

- Dokploy deep check calls `settings.health` (`settings.getAll` was removed in Dokploy v0.30).
- `INNGEST_BASE_URL` is passed to the app so it registers with self-hosted Inngest; Inngest crons (e.g. Kuma self-push) run in production.
- Home dashboard server fetches forward the session cookie, so status, billing, alerts and logs render when auth is on.
- `kuma-provision.mjs` attaches `dockyard-project` tags correctly, so Kuma webhooks map to projects instead of being dropped.
- `next dev` no longer crashes on pino transport workers (`serverExternalPackages`).
- Docs submodule URL; `hotpatch.sh` reads the VPS host from `DOCKYARD_VPS_HOST`.

## [0.1.0] - 2026-03-19

### Added

- **Project Discovery**: Pluggable discovery engine with filesystem, Dokploy, GitHub, and manual sources
- **Watchtower Health Monitoring**: Health check poller, status dashboard, per-project health detail
- **Config Management**: Environment variable editor with encryption at rest, templates, rollback, and Dokploy sync
- **Alert Engine**: Rule builder, multi-window evaluation, deduplication, grouping, escalation, and burn-rate alerts
- **Incident Management**: Incident lifecycle (open/acknowledged/resolved), timeline, and postmortem sections
- **DORA Metrics**: Deployment frequency, lead time, change failure rate, and MTTR tracking
- **MFA Authentication**: OAuth2 SSO (GitHub/Google) with FIDO2 WebAuthn and TOTP second factors
- **SLO Budgets**: SLO definitions with error budget tracking and burn-rate alerting
- **AI Insights**: Velocity scoring, confidence assessment, project summaries, and context handoff
- **Real-Time Updates**: SSE-based live dashboard with health, deploy status, and alert streams
- **Structured Logging**: Pino-based JSON logging with context propagation and sampling
- **Comprehensive Test Suite**: 181 Vitest unit/integration tests and Playwright E2E tests
- **CI Pipeline**: GitHub Actions with static analysis, build, unit tests, and E2E tests
