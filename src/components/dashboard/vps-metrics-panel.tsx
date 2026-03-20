/**
 * VPS metrics panel for the home dashboard.
 *
 * Displays four server-level metrics — CPU utilization, memory usage, disk I/O,
 * and network bandwidth — each with its current value and a historical sparkline.
 * Data is passed as props by the parent Server Component after fetching from the
 * Hetzner metrics API.
 *
 * @example
 * ```tsx
 * <VpsMetricsPanel metrics={metricsData} />
 * ```
 */

import { Sparkline } from "@/components/shared";

/** A single metric series with a display label and unit. */
export interface MetricSeries {
  /** Human-readable label shown as the metric title. */
  label: string;
  /** Current (latest) value of the metric. */
  currentValue: number;
  /** Unit string appended to the displayed value, e.g. "%" or "MB/s". */
  unit: string;
  /** Ordered historical values used to render the sparkline. */
  history: number[];
  /** Sparkline stroke color — a valid CSS color value. */
  color: string;
}

export interface VpsMetricsPanelProps {
  /** Four metric series: CPU, memory, disk I/O, network bandwidth. */
  metrics: MetricSeries[];
}

/** Card wrapper for a single metric row. */
function MetricRow({ metric }: { metric: MetricSeries }) {
  const formatted =
    metric.currentValue >= 1000
      ? `${(metric.currentValue / 1000).toFixed(1)}k`
      : metric.currentValue.toFixed(1);

  return (
    <div className="flex items-center justify-between rounded-xl border border-glass-border bg-glass-bg px-4 py-3 backdrop-blur-lg dark:glass">
      <div className="min-w-0">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {metric.label}
        </p>
        <p className="mt-0.5 font-mono text-xl font-semibold tabular-nums text-foreground">
          {formatted}
          <span className="ml-1 text-sm font-normal text-muted-foreground">
            {metric.unit}
          </span>
        </p>
      </div>
      <Sparkline
        data={metric.history}
        width={96}
        height={32}
        color={metric.color}
        className="shrink-0"
      />
    </div>
  );
}

/**
 * Renders a 2-column grid of VPS metric rows.
 *
 * Each row shows a metric label, current value with unit, and a sparkline
 * built from historical data points.
 */
export function VpsMetricsPanel({ metrics }: VpsMetricsPanelProps) {
  if (metrics.length === 0) {
    return (
      <section aria-label="VPS metrics">
        <p className="text-sm text-muted-foreground">
          No metrics available.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="VPS metrics">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Server Metrics
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => (
          <MetricRow key={metric.label} metric={metric} />
        ))}
      </div>
    </section>
  );
}
