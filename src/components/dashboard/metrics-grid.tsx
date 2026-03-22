/**
 * MetricsGrid — 2x2 grid of VPS metric cards with Tremor sparklines.
 *
 * Matches Stitch wireframe metrics section + WIREFRAMES.md 2-column layout.
 * Each card: metric label, current value + unit, SparkAreaChart.
 */

"use client";

import { SparkAreaChart } from "@tremor/react";
import { Card, CardContent } from "@/components/ui/card";

export interface MetricSeries {
  label: string;
  currentValue: number;
  unit: string;
  history: number[];
  color: string;
}

interface MetricsGridProps {
  metrics: MetricSeries[];
  serverName?: string;
}

const COLOR_MAP: Record<string, string> = {
  "#6366f1": "indigo",
  "#22c55e": "emerald",
  "#38bdf8": "sky",
  "#f59e0b": "amber",
};

export function MetricsGrid({ metrics, serverName }: MetricsGridProps) {
  return (
    <div>
      {serverName && (
        <h2 className="mb-3 text-sm font-semibold text-foreground/80">
          {serverName}
        </h2>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {metrics.map((m) => {
          const chartData = m.history.map((v, i) => ({
            idx: i,
            value: v,
          }));
          const tremorColor = COLOR_MAP[m.color] ?? "blue";

          return (
            <Card
              key={m.label}
              className="bg-card border-glass-border backdrop-blur-lg"
            >
              <CardContent className="flex items-end justify-between p-4">
                <div>
                  <p className="text-xs text-muted-foreground/60">
                    {m.label}
                  </p>
                  <p className="font-data text-xl font-semibold tabular-nums text-foreground">
                    {formatValue(m.currentValue, m.unit)}
                    <span className="ml-1 text-xs font-normal text-muted-foreground/50">
                      {m.unit}
                    </span>
                  </p>
                </div>
                {m.history.length >= 2 && (
                  <SparkAreaChart
                    data={chartData}
                    categories={["value"]}
                    index="idx"
                    colors={[tremorColor]}
                    className="h-8 w-20"
                    curveType="monotone"
                  />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function formatValue(value: number, unit: string): string {
  if (unit === "%" || unit === "IOPS") return value.toFixed(0);
  if (unit === "MB/s") return value.toFixed(1);
  return value.toFixed(1);
}
