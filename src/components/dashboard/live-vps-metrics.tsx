"use client";

/**
 * Real-time VPS metrics panel.
 *
 * Wraps VpsMetricsPanel with SSE-driven auto-refresh.
 * Receives initial data from the RSC page and subscribes to
 * "metrics.updated" events for live updates.
 */

import {
  VpsMetricsPanel,
  type MetricSeries,
} from "@/components/dashboard/vps-metrics-panel";
import { useRealtimeData } from "@/lib/sse";

interface LiveVpsMetricsProps {
  initialMetrics: MetricSeries[];
  metricsUrl: string;
  /** Server name shown above the metrics grid. */
  serverName?: string;
}

export function LiveVpsMetrics({
  initialMetrics,
  metricsUrl,
  serverName,
}: LiveVpsMetricsProps) {
  const { data: metrics } = useRealtimeData<MetricSeries[]>(
    initialMetrics,
    metricsUrl,
    "metrics.updated",
    { maxPoints: 60 }
  );

  return <VpsMetricsPanel metrics={metrics} serverName={serverName} />;
}
