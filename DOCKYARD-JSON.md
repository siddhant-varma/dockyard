# `.dockyard.json` Reference

> Experimental — schema may evolve in future versions.

A `.dockyard.json` file in your project root lets you customize how DockYard discovers and tracks your project.

## Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | No | Display name (overrides directory name) |
| `slug` | string | No | URL-safe identifier (overrides auto-generated slug) |
| `description` | string | No | Short project description |
| `techStack` | string[] | No | Technology tags (merged with auto-detected stack) |
| `healthEndpoint` | string | No | URL for health check polling (e.g., `http://localhost:3001/healthz`) |
| `dipLevel` | number (0-4) | No | DockYard Integration Protocol level implemented |
| `ignore` | boolean | No | Set `true` to exclude this project from discovery |

## Example

```json
{
  "name": "Project Alpha",
  "slug": "project-alpha",
  "description": "Example web application with real-time features",
  "techStack": ["next.js", "typescript", "postgresql", "redis"],
  "healthEndpoint": "http://localhost:3001/healthz",
  "dipLevel": 1,
  "ignore": false
}
```

## Minimal Example

Only include what you need — all fields are optional:

```json
{
  "name": "My Project",
  "healthEndpoint": "http://localhost:8080/health"
}
```

## Ignoring a Project

To prevent DockYard from discovering a directory:

```json
{
  "ignore": true
}
```

## How It Works

1. The filesystem discovery source scans directories for project indicators
2. If `.dockyard.json` exists, it reads and merges the metadata
3. Fields from `.dockyard.json` take precedence over auto-detection
4. The `ignore: true` flag skips the project entirely
