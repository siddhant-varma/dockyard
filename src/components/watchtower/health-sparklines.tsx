"use client";

/**
 * HealthSparklines — latency sparkline and uptime bar chart
 * for the Watchtower health detail page.
 *
 * Fetches from GET /api/projects/:slug/health/trends and
 * GET /api/projects/:slug/health/uptime, then renders Tremor
 * SparkAreaChart for latency and a simple bar visualization for uptime.
 */

import { useEffect, useState } from "react";
import { SparkAreaChart } from "@tremor/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TrendsData {
  latencyTrend: number[];
  statusHistory: Array<{ status: string; checkedAt: string }>;
}

interface UptimeData {
  uptime: {
    percentage: number;
    totalChecks: number;
    successfulChecks: number;
    windowDays: number;
  };
  buckets: Array<{ bucket: string; uptimePercent: number }>;
}

interface HealthSparklinesProps {
  /** Project slug used to build API URLs. */
  slug: string;
}

export function HealthSparklines({ slug }: HealthSparklinesProps) {
  const [trends, setTrends] = useState<TrendsData | null>(null);
  const [uptimeData, setUptimeData] = useState<UptimeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [trendsRes, uptimeRes] = await Promise.all([
          fetch(`/api/projects/${slug}/health/trends`),
          fetch(`/api/projects/${slug}/health/uptime`),
        ]);

        if (cancelled) return;

        if (trendsRes.ok) {
          setTrends(await trendsRes.json());
        }
        if (uptimeRes.ok) {
          setUptimeData(await uptimeRes.json());
        }
      } catch {
        // Silently fail — sparklines are non-critical
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="bg-card border-glass-border backdrop-blur-lg animate-pulse">
          <CardContent className="h-28 p-4" />
        </Card>
        <Card className="bg-card border-glass-border backdrop-blur-lg animate-pulse">
          <CardContent className="h-28 p-4" />
        </Card>
      </div>
    );
  }

  const latencyData = trends?.latencyTrend ?? [];
  const chartData = latencyData.map((v, i) => ({ idx: i, ms: v }));
  const avgLatency =
    latencyData.length > 0
      ? Math.round(latencyData.reduce((a, b) => a + b, 0) / latencyData.length)
      : null;

  const buckets = uptimeData?.buckets ?? [];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {/* Latency sparkline */}
      <Card className="bg-card border-glass-border backdrop-blur-lg">
        <CardHeader className="pb-1">
          <CardTitle className="text-sm">Latency (24h)</CardTitle>
        </CardHeader>
        <CardContent className="flex items-end justify-between p-4 pt-0">
          <div>
            {avgLatency !== null ? (
              <p className="font-data text-xl font-semibold tabular-nums text-foreground">
                {avgLatency}
                <span className="ml-1 text-xs font-normal text-muted-foreground/50">
                  ms avg
                </span>
              </p>
            ) : (
              <p className="text-sm text-foreground/40">No data</p>
            )}
          </div>
          {chartData.length >= 2 && (
            <SparkAreaChart
              data={chartData}
              categories={["ms"]}
              index="idx"
              colors={["indigo"]}
              className="h-8 w-24"
              curveType="monotone"
            />
          )}
        </CardContent>
      </Card>

      {/* Uptime buckets */}
      <Card className="bg-card border-glass-border backdrop-blur-lg">
        <CardHeader className="pb-1">
          <CardTitle className="text-sm">Uptime (24h)</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {uptimeData?.uptime ? (
            <p className="mb-2 font-data text-xl font-semibold tabular-nums text-foreground">
              {uptimeData.uptime.percentage.toFixed(2)}
              <span className="ml-1 text-xs font-normal text-muted-foreground/50">
                %
              </span>
            </p>
          ) : (
            <p className="mb-2 text-sm text-foreground/40">No data</p>
          )}
          {buckets.length > 0 && (
            <div className="flex items-end gap-px h-6">
              {buckets.map((b, i) => {
                const pct = b.uptimePercent;
                const color =
                  pct >= 99.9
                    ? "bg-green-400"
                    : pct >= 99
                      ? "bg-yellow-400"
                      : "bg-red-400";
                return (
                  <div
                    key={i}
                    className={`flex-1 rounded-sm ${color}`}
                    style={{ height: `${Math.max(pct, 10)}%` }}
                    title={`${pct.toFixed(1)}%`}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
