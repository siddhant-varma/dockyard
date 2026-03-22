/**
 * MetricsGrid — 2x2 grid of VPS metric cards with sparklines.
 *
 * Matches Stitch wireframe metrics section + WIREFRAMES.md 2-column layout.
 * Each card: metric label, current value + unit, inline sparkline.
 */

import {
  Card,
  CardContent,
} from "@/components/ui/card";

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

export function MetricsGrid({ metrics, serverName }: MetricsGridProps) {
  return (
    <div>
      {serverName && (
        <h2 className="mb-3 text-sm font-semibold text-foreground/80">
          {serverName}
        </h2>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {metrics.map((m) => (
          <Card key={m.label} className="bg-card border-glass-border backdrop-blur-lg">
            <CardContent className="flex items-end justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground/60">{m.label}</p>
                <p className="text-xl font-semibold tabular-nums text-foreground">
                  {formatValue(m.currentValue, m.unit)}
                  <span className="ml-1 text-xs font-normal text-muted-foreground/50">
                    {m.unit}
                  </span>
                </p>
              </div>
              {m.history.length >= 2 && (
                <MiniSparkline
                  data={m.history}
                  color={m.color}
                  width={72}
                  height={28}
                />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function formatValue(value: number, unit: string): string {
  if (unit === "%" || unit === "IOPS") return value.toFixed(0);
  if (unit === "MB/s") return value.toFixed(1);
  return value.toFixed(1);
}

/** Pure SVG sparkline — no external chart library needed. */
function MiniSparkline({
  data,
  color,
  width,
  height,
}: {
  data: number[];
  color: string;
  width: number;
  height: number;
}) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 1;

  const points = data
    .map((v, i) => {
      const x = pad + (i / (data.length - 1)) * (width - pad * 2);
      const y = height - pad - ((v - min) / range) * (height - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="opacity-80"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
