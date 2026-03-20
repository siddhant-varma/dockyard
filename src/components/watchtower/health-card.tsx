/**
 * HealthCard — compact summary card for a single project's health state.
 *
 * Displays the project name, a color-coded health status badge, 30-day
 * uptime percentage, and a sparkline of recent latency readings.
 * The entire card is a link to the project's health detail page.
 *
 * @param projectName - Human-readable project name.
 * @param slug        - URL slug used to build the detail page href.
 * @param status      - Current health status: "healthy" | "degraded" | "down" | "unknown".
 * @param uptime30d   - 30-day uptime percentage (0–100), or null if not yet calculated.
 * @param latencySeries - Array of recent latency readings (ms) for the sparkline.
 */

import Link from "next/link";
import { StatusBadge, Sparkline } from "@/components/shared";

interface HealthCardProps {
  projectName: string;
  slug: string;
  status: string;
  uptime30d: number | null;
  latencySeries: number[];
}

const BORDER_BY_STATUS: Record<string, string> = {
  healthy: "border-green-500/15",
  degraded: "border-yellow-500/15",
  down: "border-red-500/15",
  maintenance: "border-indigo-500/15",
};

const SPARKLINE_COLOR_BY_STATUS: Record<string, string> = {
  healthy: "#22c55e",
  degraded: "#eab308",
  down: "#ef4444",
  maintenance: "#6366f1",
};

export function HealthCard({
  projectName,
  slug,
  status,
  uptime30d,
  latencySeries,
}: HealthCardProps) {
  const borderClass =
    BORDER_BY_STATUS[status] ?? "border-glass-border";
  const sparkColor = SPARKLINE_COLOR_BY_STATUS[status] ?? "#a3a3a3";
  const uptimeDisplay = uptime30d != null ? `${uptime30d.toFixed(2)}%` : "—";

  return (
    <Link
      href={`/watchtower/${slug}`}
      className={`group flex flex-col gap-3 rounded-xl border bg-glass-bg p-4 backdrop-blur-lg transition-all hover:bg-glass-hover hover:glow-primary dark:glass ${borderClass}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold text-foreground group-hover:text-primary">
          {projectName}
        </span>
        <StatusBadge status={status} />
      </div>

      <div className="flex items-end justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">
            30d uptime
          </span>
          <span className="font-mono text-sm font-medium tabular-nums text-foreground/80">
            {uptimeDisplay}
          </span>
        </div>

        {latencySeries.length >= 2 && (
          <Sparkline
            data={latencySeries}
            width={80}
            height={28}
            color={sparkColor}
            className="opacity-80"
          />
        )}
      </div>
    </Link>
  );
}
