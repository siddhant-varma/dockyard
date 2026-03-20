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
  healthy: "bg-green-500",
  ok: "bg-green-500",
  degraded: "bg-yellow-500",
  down: "bg-red-500",
  maintenance: "bg-indigo-500",
  unknown: "bg-neutral-400",
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
      <span className={`inline-block h-2 w-2 rounded-full ${dotColor}`} />
      <span className="text-sm capitalize text-neutral-700 dark:text-neutral-300">
        {displayLabel}
      </span>
    </div>
  );
}
