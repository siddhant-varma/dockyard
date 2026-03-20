/**
 * Self-Health page — /self-health
 *
 * Server component. DockYard monitors its own infrastructure using
 * the same patterns as Watchtower. Shows system components status,
 * background job health, and resource usage. Glass Observatory styling.
 */

const INTERNAL_BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

interface HealthResponse {
  status: string;
  timestamp: string;
  components?: Record<
    string,
    { status: string; latencyMs?: number; detail?: string }
  >;
}

async function fetchSelfHealth(): Promise<HealthResponse | null> {
  try {
    const res = await fetch(`${INTERNAL_BASE}/api/health`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json() as Promise<HealthResponse>;
  } catch {
    return null;
  }
}

const STATUS_DOT: Record<string, string> = {
  ok: "bg-green-400",
  healthy: "bg-green-400",
  degraded: "bg-yellow-400",
  down: "bg-red-400",
  unknown: "bg-muted-foreground",
};

const STATUS_TEXT: Record<string, string> = {
  ok: "text-green-400",
  healthy: "text-green-400",
  degraded: "text-yellow-400",
  down: "text-red-400",
};

export default async function SelfHealthPage() {
  const health = await fetchSelfHealth();
  const isHealthy =
    health?.status === "ok" || health?.status === "healthy";
  const components = health?.components ?? {};

  return (
    <div className="flex flex-col gap-6">
      {/* Status hero */}
      <div className="flex flex-col items-center justify-center rounded-xl border border-glass-border bg-glass-bg p-8 backdrop-blur-lg text-center">
        <div
          className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
            isHealthy
              ? "bg-green-500/15 border border-green-500/20"
              : "bg-yellow-500/15 border border-yellow-500/20"
          }`}
        >
          {isHealthy ? (
            <svg
              className="h-8 w-8 text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          ) : (
            <svg
              className="h-8 w-8 text-yellow-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.999L13.732 4.001c-.77-1.333-2.694-1.333-3.464 0L3.34 16.001C2.57 17.334 3.532 19 5.072 19z"
              />
            </svg>
          )}
        </div>
        <h1
          className={`text-xl font-semibold ${isHealthy ? "text-green-400" : "text-yellow-400"}`}
        >
          {isHealthy ? "DockYard is Healthy" : "DockYard Needs Attention"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground/60">
          {health
            ? `Last checked: ${new Date(health.timestamp).toLocaleTimeString()}`
            : "Health endpoint unavailable"}
        </p>
      </div>

      {/* System Components */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground/80">
          System Components
        </h2>
        <div className="overflow-hidden rounded-xl border border-glass-border bg-glass-bg backdrop-blur-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-glass-border text-left">
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                  Component
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                  Status
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                  Latency
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                  Details
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(components).length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-muted-foreground/50"
                  >
                    No component data available. Configure the /api/health
                    endpoint.
                  </td>
                </tr>
              ) : (
                Object.entries(components).map(([name, comp]) => (
                  <tr
                    key={name}
                    className="border-b border-glass-divider last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-foreground/80 capitalize">
                      {name}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${STATUS_DOT[comp.status] ?? STATUS_DOT.unknown}`}
                        />
                        <span
                          className={`text-sm capitalize ${STATUS_TEXT[comp.status] ?? "text-muted-foreground"}`}
                        >
                          {comp.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground/60">
                      {comp.latencyMs != null ? `${comp.latencyMs}ms` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground/50">
                      {comp.detail ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
