"use client";

/**
 * Real-time per-project health detail.
 *
 * Wraps HealthMetrics with SSE-driven auto-refresh.
 * Subscribes to "health.updated" events to refresh data live.
 */

import { useRealtimeData } from "@/lib/sse";
import { HealthMetrics } from "@/components/watchtower/health-metrics";

interface ComponentHealth {
  name: string;
  status: string;
  latencyMs: number | null;
}

interface HealthDetail {
  overallStatus: string;
  uptime: number | null;
  components: ComponentHealth[];
}

interface LiveHealthDetailProps {
  slug: string;
  initialDetail: HealthDetail;
}

export function LiveHealthDetail({
  slug,
  initialDetail,
}: LiveHealthDetailProps) {
  const { data: detail } = useRealtimeData<HealthDetail>(
    initialDetail,
    `/api/health/projects/${slug}`,
    "health.updated"
  );

  return (
    <HealthMetrics
      overallStatus={detail.overallStatus}
      uptime30d={detail.uptime}
      components={detail.components}
    />
  );
}
