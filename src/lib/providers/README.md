# lib/providers

Abstract interfaces that define the contract between DockYard core code and
all infrastructure and deployment platform adapters.

## What it does

DockYard never imports a concrete provider directly. All core code — API
routes, Inngest functions, service modules — operates against the interfaces
defined here. This ensures that swapping Dokploy for Coolify, or Hetzner for
DigitalOcean, requires only writing a new adapter, not touching core logic.

## Key exports (`types.ts`)

| Export | Description |
|--------|-------------|
| `DeployProvider` | Interface for deployment platforms (list apps, deploy, manage env vars, fetch logs and metrics) |
| `InfraProvider` | Interface for cloud infrastructure providers (list servers, fetch metrics, volumes, pricing) |
| `ApplicationSummary` / `ApplicationDetail` | Standardized app representations |
| `ServerSummary` / `ServerDetail` | Standardized server representations |
| `MetricSeries` / `MetricDataPoint` | Shared time-series metric types |
| `DeployResult` / `LogEntry` / `LogOptions` | Deployment and log types |
| `TimeRange` | Shared time-range input for metric queries |
| `PricingInfo` | Billing/pricing data shape |

## Current adapters

- `DeployProvider` → `src/lib/dokploy/` (Dokploy deploy platform)
- `InfraProvider` → `src/lib/hetzner/` (Hetzner Cloud)

## Adding a new adapter

1. Create a new directory, e.g., `src/lib/coolify/`.
2. Implement `DeployProvider` (or `InfraProvider`) from this file.
3. Register the adapter wherever providers are instantiated (API routes or
   Inngest functions). Core code imports only the interface — no changes
   needed there.
