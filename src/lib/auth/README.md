# lib/auth

Authentication and role-based access control for DockYard.

## What it does

Configures [Auth.js v5 (NextAuth)](https://authjs.dev/) with GitHub OAuth,
persists user accounts via the Drizzle adapter to PostgreSQL, and issues
stateless JWT sessions. Layered on top of authentication is a simple three-tier
RBAC model (`viewer` → `project_admin` → `superadmin`) enforced by helper
functions used in API routes and server components.

The first user to sign in is automatically promoted to `superadmin`.

## Key exports (`index.ts` — import from `@/lib/auth`)

| Export | Description |
|--------|-------------|
| `auth` | Read the current session (server-side, from Auth.js) |
| `signIn` / `signOut` | Auth.js sign-in/sign-out actions |
| `handlers` | Next.js route handlers — mount at `app/api/auth/[...nextauth]/route.ts` |
| `requireAuth()` | Async function — returns `AuthUser` or throws `401 ApiError` |
| `requireRole(user, role)` | Throws `403 ApiError` if user's role is below the minimum |
| `AuthUser` | Session user type: `{ id, name, email, image, role }` |
| `withAuth` | Route wrapper that enforces authentication on a handler |

## Role hierarchy

```
viewer < project_admin < superadmin
```

`requireRole` accepts the minimum required role and allows anything equal or
higher. Roles are stored in the `users` table and embedded in the JWT at sign-in.

## Environment variables

| Variable | Description |
|----------|-------------|
| `AUTH_SECRET` | Random secret used to sign JWT tokens (generate with `openssl rand -hex 32`) |
| `AUTH_GITHUB_ID` | GitHub OAuth App client ID |
| `AUTH_GITHUB_SECRET` | GitHub OAuth App client secret |

## Extending auth providers

Auth.js supports many OAuth providers. To add Google, for example, import
`Google` from `next-auth/providers/google`, add it to the `providers` array in
`config.ts`, and supply the corresponding environment variables. No other
changes are needed.
