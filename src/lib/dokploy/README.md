# lib/dokploy

Adapter that implements the `DeployProvider` interface for the
[Dokploy](https://docs.dokploy.com/docs/api) self-hosted deployment platform.

## What it does

`DokployClient` wraps the Dokploy REST API and provides DockYard with a
standardized way to manage deployed applications: listing services, reading and
writing environment variables, triggering deployments, and fetching logs and
metrics. All Dokploy API calls originate here — never from frontend code or API
route handlers directly.

## Key exports (`client.ts`)

| Export | Description |
|--------|-------------|
| `DokployClient` | Implements `DeployProvider`. Constructed with `baseUrl` and `apiKey`. |

## Important Dokploy quirks

- **Environment variables are full-string only.** The Dokploy API does not
  accept individual key-value pairs. `saveEnvironment` must receive the entire
  env block as a single string.
- **Redeploy is a separate call.** Saving environment variables via
  `saveEnvironment` does not restart the application. Call `redeploy` after
  saving to apply the new environment.

## Swapping this adapter

To replace Dokploy with another deployment platform (e.g., Coolify, CapRover):

1. Create a new directory, e.g., `src/lib/coolify/`.
2. Implement `DeployProvider` from `src/lib/providers/types.ts`.
3. Replace the `DokployClient` instantiation in your provider factory with the
   new class. No other code changes are required.

## Environment variables

| Variable | Description |
|----------|-------------|
| `DOKPLOY_BASE_URL` | Base URL of the Dokploy instance (e.g., `https://dokploy.example.com`) |
| `DOKPLOY_API_KEY` | API key from the Dokploy admin panel |
