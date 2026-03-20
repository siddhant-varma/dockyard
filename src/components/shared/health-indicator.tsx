/**
 * Health indicator — colored dot with label showing health state.
 *
 * @example
 * ```tsx
 * <HealthIndicator status="healthy" />
 * <HealthIndicator status="degraded" label="API Server" />
 * ```
 */

const DOT_COLORS: Record<string, string> = {
  healthy: "bg-green-400",
  ok: "bg-green-400",
  degraded: "bg-yellow-400",
  down: "bg-red-400",
  maintenance: "bg-indigo-400",
  unknown: "bg-muted-foreground",
};

interface HealthIndicatorProps {
  status: string;
  label?: string;
  className?: string;
}

export function HealthIndicator({
  status,
  label,
  className = "",
}: HealthIndicatorProps) {
  const dotColor = DOT_COLORS[status] ?? DOT_COLORS.unknown;
  const displayLabel = label ?? status;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="relative flex h-2 w-2">
        <span className={`absolute inline-flex h-full w-full rounded-full ${dotColor} opacity-40 animate-pulse-dot`} />
        <span className={`relative inline-flex h-2 w-2 rounded-full ${dotColor}`} />
      </span>
      <span className="text-sm capitalize text-foreground/80">
        {displayLabel}
      </span>
    </div>
  );
}
