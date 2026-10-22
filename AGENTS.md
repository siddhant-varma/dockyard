# AGENTS.md — DockYard

Entry point for any coding agent. `CLAUDE.md` is the full reference; read it before changing code.

## Rules
- This repo is public. Never commit secrets, internal IPs, hostnames or usernames. gitleaks runs in pre-commit and CI.
- Never commit to `main`. Use a feature branch and open a PR. Merging to `main` deploys production.
- Database schema lives in `src/db/schema.ts` and is applied by `drizzle-kit push` at container start (`scripts/start.sh`). Before changing it, dry-run the push against a copy of production and review the SQL.
- Keep `CHANGELOG.md` (Unreleased) current in the same PR.

## Where things are
| What | Where |
|---|---|
| App (Next.js) | `src/app`, `src/lib` |
| DB schema | `src/db/schema.ts` |
| Health checks | `src/lib/health/checks/` (`/api/health`, `/api/health/deep`) |
| Image / startup | `Dockerfile`, `scripts/start.sh` |
| Production compose | `docker-compose.production.yml` |
| CI | `.github/workflows/` |

## Actions log
Newest first. Add one line per change that matters to the next agent.
- 2026-10-22: Startup schema push fixed (BUG-024): drizzle-kit has its full dependency tree in `/app/migrate`, `schema.ts` matches production, and a failed push is reported by the deep health `schema` check.
- 2026-10-16: Phase CI part 1: images built in GitHub Actions and pushed to GHCR. The healthcheck is liveness only. Kuma provisioning supports TOTP.
