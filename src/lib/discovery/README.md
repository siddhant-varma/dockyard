# lib/discovery

Automatic project discovery engine for DockYard.

## What it does

Rather than requiring manual project registration, DockYard auto-detects
projects from multiple sources. This module defines the `DiscoverySource`
interface, the `DiscoveredProject` and `ScanResult` data types, and the scanner
orchestrator (`scanAll` / `scanSource`) that runs all enabled sources, merges
results by slug, and upserts to the `projects` database table.

Discovery sources are stored in the `discovery_sources` table. Each record
holds a `type`, a `name`, an `enabled` flag, and a JSONB `config` block that
is passed directly to the source implementation at scan time.

## Key exports

| File | Export | Description |
|------|--------|-------------|
| `scanner.ts` | `scanAll()` | Run all enabled sources and upsert results to DB |
| `scanner.ts` | `scanSource(sourceId)` | Run a single source by its DB record UUID |
| `scanner.ts` | `registerSource(source)` | Register a `DiscoverySource` implementation at startup |
| `types.ts` | `DiscoverySource` | Interface all source implementations must satisfy |
| `types.ts` | `DiscoveredProject` | Normalized project shape produced by a source |
| `types.ts` | `ScanResult` | Summary returned by `scanAll` (found/created/updated per source) |
| `types.ts` | `DiscoverySourceType` | `"filesystem" \| "dokploy" \| "github" \| "manual"` |
| `indicators.ts` | Project indicator detection utilities for filesystem scanning |

## Available source implementations

- `sources/filesystem.ts` — Scans sibling directories for project indicators
  (package.json, Dockerfile, .git, .dockyard.json). Used in local dev mode.

## Adding a new source

1. Create `src/lib/discovery/sources/<name>.ts`.
2. Implement `DiscoverySource` from `types.ts` — provide a `type` string and
   a `scan(config)` method that returns `DiscoveredProject[]`.
3. Call `registerSource(new YourSource())` at application startup.
4. Insert a row into `discovery_sources` with the matching `type` and `config`.
   The scanner will pick it up automatically on the next run.
