# lib/hetzner

Adapter that implements the `InfraProvider` interface for the
[Hetzner Cloud](https://docs.hetzner.cloud/) API.

## What it does

`HetznerClient` wraps the Hetzner Cloud REST API (`https://api.hetzner.cloud/v1`)
and provides DockYard with a standardized view of the underlying infrastructure:
servers, volumes, floating IPs, load balancers, time-series metrics, and pricing
data. All Hetzner API calls originate here — never from frontend code or API
route handlers directly.

## Key exports (`client.ts`)

| Export | Description |
|--------|-------------|
| `HetznerClient` | Implements `InfraProvider`. Constructed with an `apiToken`. |

## Important Hetzner quirks

- **No direct billing endpoint.** Hetzner Cloud does not expose a current bill
  via its API. To display billing estimates, calculate cost from the active
  server/resource types and `getPricing()` data.
- **Metric resolution.** The minimum step interval for `getServerMetrics` varies
  by time range. Very short ranges with a small step may be clamped by the API.

## Swapping this adapter

To replace Hetzner with another infrastructure provider (e.g., DigitalOcean, AWS):

1. Create a new directory, e.g., `src/lib/digitalocean/`.
2. Implement `InfraProvider` from `src/lib/providers/types.ts`.
3. Replace the `HetznerClient` instantiation in your provider factory with the
   new class. No other code changes are required.

## Environment variables

| Variable | Description |
|----------|-------------|
| `HETZNER_API_TOKEN` | API token from the Hetzner Cloud console |
