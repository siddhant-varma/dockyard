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
  healthy: "border-green-200 dark:border-green-800",
  degraded: "border-yellow-200 dark:border-yellow-800",
  down: "border-red-200 dark:border-red-800",
  maintenance: "border-indigo-200 dark:border-indigo-800",
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
    BORDER_BY_STATUS[status] ?? "border-neutral-200 dark:border-neutral-700";
  const sparkColor = SPARKLINE_COLOR_BY_STATUS[status] ?? "#a3a3a3";
  const uptimeDisplay = uptime30d != null ? `${uptime30d.toFixed(2)}%` : "—";

  return (
    <Link
      href={`/watchtower/${slug}`}
      className={`group flex flex-col gap-3 rounded-lg border bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:bg-neutral-900 ${borderClass}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold text-neutral-900 group-hover:text-neutral-700 dark:text-neutral-100 dark:group-hover:text-neutral-300">
          {projectName}
        </span>
        <StatusBadge status={status} />
      </div>

      <div className="flex items-end justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            30d uptime
          </span>
          <span className="text-sm font-medium tabular-nums text-neutral-800 dark:text-neutral-200">
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
