/**
 * Diagnostic mode banner — shown at the top of every page when
 * `DOCKYARD_DIAGNOSTIC=true`. Provides a visual indicator that the
 * app is running in diagnostic mode with real data fetch attempts.
 *
 * Server component. Only renders when diagnostic mode is active.
 */

import { isDiagnosticMode } from "@/lib/env";

/** Key API endpoints to probe for health status. */
const HEALTH_PROBES = [
  { label: "Database", path: "/api/health" },
  { label: "Projects", path: "/api/projects" },
  { label: "Settings", path: "/api/settings" },
  { label: "Discovery", path: "/api/discovery/sources" },
] as const;

interface ProbeResult {
  label: string;
  healthy: boolean;
  error?: string;
}

/**
 * Probe a single API endpoint and return its health status.
 */
async function probeEndpoint(
  baseUrl: string,
  probe: (typeof HEALTH_PROBES)[number]
): Promise<ProbeResult> {
  try {
    const res = await fetch(`${baseUrl}${probe.path}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    return { label: probe.label, healthy: res.ok };
  } catch (err) {
    return {
      label: probe.label,
      healthy: false,
      error: err instanceof Error ? err.message : "Unreachable",
    };
  }
}

/**
 * Diagnostic banner component.
 * Renders only when `DOCKYARD_DIAGNOSTIC=true`.
 * Shows aggregate health count and per-component status.
 */
export async function DiagnosticBanner() {
  if (!isDiagnosticMode) return null;

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const results = await Promise.all(
    HEALTH_PROBES.map((probe) => probeEndpoint(baseUrl, probe))
  );

  const healthy = results.filter((r) => r.healthy).length;
  const total = results.length;

  return (
    <div className="border-b border-amber-500/30 bg-amber-500/5 px-4 py-2">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-400">
            Diagnostic Mode
          </span>
          <span className="text-xs text-amber-400/80">
            {healthy}/{total} components healthy
          </span>
        </div>
        <div className="flex items-center gap-2">
          {results.map((r) => (
            <div
              key={r.label}
              className="flex items-center gap-1"
              title={r.error ?? (r.healthy ? "OK" : "Failed")}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  r.healthy ? "bg-emerald-500" : "bg-red-500"
                }`}
              />
              <span className="text-[10px] text-foreground/50">{r.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
