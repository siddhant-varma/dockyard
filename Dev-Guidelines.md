# Development Guidelines (Universal Template)

> Coding standards and pre-commit checklist applicable across projects. Derived from 32 sessions of production development.

---

## 1. File Management

- **Max 400 lines per file**. If a file grows beyond this, split by responsibility.
- **One responsibility per file**. A service file does service logic. A route file does routing. A component file renders one component.
- **No orphan files**. Every file must be imported somewhere. Dead code gets deleted, not commented out.

## 2. Code Quality

### Backend (Python / Any Server Language)
- Type hints on all function signatures
- Docstrings on all public functions
- No `print()` statements — use structured logging
- No bare `except:` — catch specific exceptions
- Business logic in `services/`, never in route handlers
- Database queries in service layer, never in routes
- All external API calls wrapped in try/except with timeout
- Secrets from environment variables, never hardcoded

### Frontend (TypeScript / React)
- Strict mode enabled, no `any` types
- Functional components only
- No `console.log()` in committed code
- No inline styles — use CSS framework utilities
- All API responses typed with interfaces
- State management: local state for component, store for cross-component, server state for API data
- Forms: validation library + schema validation (e.g., Zod)
- Every mutation must invalidate affected query cache

### Universal
- No TODO comments older than 2 weeks — either do it or delete it
- No commented-out code — git has history
- Error messages must be actionable: "Upload a Zerodha tradebook CSV, not a holdings snapshot" beats "Invalid file format"
- No mock/sample/placeholder data in production code paths

## 3. Architecture Rules

- **Service layer pattern**: Routes accept requests and return responses. Services contain logic. Routes call services.
- **Schema validation at boundaries**: Validate input at API entry. Trust internal data.
- **Cache strategy**: Define TTLs per data type. Document them. Invalidate explicitly after mutations.
- **Database migrations**: Never edit the database directly. Every schema change goes through the migration tool.
- **Plugin/adapter pattern**: External integrations behind interfaces. Swap implementations without touching consumers.

## 4. Serialization Boundaries

> The #1 source of full-stack bugs is type mismatches between backend and frontend.

- Backend `Decimal` serializes as JSON `string` — frontend must coerce with `Number()`
- Backend `Optional[T]` must map to frontend `T | null` — never `T | undefined`
- Backend `datetime` serializes as ISO string — frontend must parse, not assume `Date`
- Backend enum values must exactly match frontend union types
- Audit boundaries after every schema change (use `/boundary-check` skill)

## 5. Git Workflow

- Never commit directly to main
- Never make a commit unless explicitly asked
- Commit messages: `type(scope): description` — e.g., `feat(dashboard): add portfolio value chart`
- Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `security`
- One logical change per commit — don't mix features with refactors

## 6. Pre-Commit Checklist

Before every commit, verify:

- [ ] **Coherence**: Does the change do what was asked? Nothing more, nothing less.
- [ ] **Conventions**: File size under 400 lines? Type hints? No debug statements?
- [ ] **Architecture**: Logic in service layer? Schemas validated? Cache invalidated?
- [ ] **Security**: No secrets in code? No SQL injection? No XSS vectors? Input validated?
- [ ] **Tests**: Relevant tests pass? New behavior has test coverage?
- [ ] **Docs**: Task tracker updated? Architecture docs still accurate?

## 7. Documentation Standards

- **CLAUDE.md** is the source of truth for project context — keep it current
- **HANDOFF.md** captures session state — update at end of every session
- **Tasks.md** tracks work — check off tasks as completed
- Session handover notes are ephemeral — only HANDOFF.md is authoritative
- Phase execution plans are deleted when the phase is complete
- If a doc is stale, delete it. Don't leave landmines for future developers.

## 8. Common Bug Prevention

| Bug Pattern | Prevention |
|-------------|------------|
| Cache shows stale data | Add `invalidateQueries()` in every mutation's `onSuccess` |
| Decimal renders as string | Wrap in `Number()` before `.toFixed()` or `.toLocaleString()` |
| Optional field crashes | Check `!= null` before accessing nested properties |
| Environment-specific failures | Test in Docker if local env differs from production |
| Duplicate data entries | Deduplicate by natural key (ISIN, order_id, content_hash) before insert |
| Plugin/path resolution | Use absolute paths or verify relative paths from the execution context |

## 9. Output Preferences

- Output entire files for heavy changes, not inline diffs
- Keep responses concise — lead with the answer, not the reasoning
- No trailing summaries after code output — the diff speaks for itself
- When referencing files, use `file.ts:42` format for quick navigation
