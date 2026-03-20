/**
 * HealthMetrics — per-project health detail panel.
 *
 * Server component. Renders the overall health status, a component-level
 * breakdown (each component with a status dot and latency reading), and
 * the 30-day uptime percentage.
 *
 * @param overallStatus  - Aggregate health status string.
 * @param uptime30d      - Calculated 30-day uptime percentage, or null.
 * @param components     - Array of individual component health readings.
 */

import { StatusBadge, HealthIndicator } from "@/components/shared";

interface ComponentHealth {
  name: string;
  status: string;
  latencyMs: number | null;
}

interface HealthMetricsProps {
  overallStatus: string;
  uptime30d: number | null;
  components: ComponentHealth[];
}

export function HealthMetrics({
  overallStatus,
  uptime30d,
  components,
}: HealthMetricsProps) {
  const uptimeDisplay =
    uptime30d != null ? `${uptime30d.toFixed(2)}%` : "Not yet calculated";

  return (
    <div className="flex flex-col gap-6">
      {/* Overall status row */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Overall status
          </span>
          <StatusBadge status={overallStatus} />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            30-day uptime
          </span>
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {uptimeDisplay}
          </span>
        </div>
      </div>

      {/* Component breakdown */}
      {components.length > 0 && (
        <div className="rounded-xl border border-glass-border">
          <div className="border-b border-glass-border px-4 py-2.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Components
            </span>
          </div>
          <ul className="divide-y divide-glass-divider">
            {components.map((component) => (
              <li
                key={component.name}
                className="flex items-center justify-between px-4 py-3"
              >
                <HealthIndicator
                  status={component.status}
                  label={component.name}
                />
                <span className="text-xs tabular-nums text-muted-foreground">
                  {component.latencyMs != null
                    ? `${component.latencyMs} ms`
                    : "—"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {components.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No component health data available.
        </p>
      )}
    </div>
  );
}
