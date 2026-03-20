/**
 * Color-coded status badge for projects and health states.
 *
 * Renders a small pill with background color matching the status.
 * Works for both project lifecycle statuses and health statuses.
 *
 * @example
 * ```tsx
 * <StatusBadge status="active" />
 * <StatusBadge status="healthy" />
 * <StatusBadge status="degraded" />
 * ```
 */

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  // Project statuses
  discovered: {
    bg: "bg-blue-500/15 border border-blue-500/20",
    text: "text-blue-400",
  },
  discovery: {
    bg: "bg-blue-500/15 border border-blue-500/20",
    text: "text-blue-400",
  },
  active: {
    bg: "bg-green-500/15 border border-green-500/20",
    text: "text-green-400",
  },
  paused: {
    bg: "bg-yellow-500/15 border border-yellow-500/20",
    text: "text-yellow-400",
  },
  completed: {
    bg: "bg-glass-hover border border-glass-border",
    text: "text-muted-foreground",
  },
  archived: {
    bg: "bg-glass-hover border border-glass-border",
    text: "text-muted-foreground/60",
  },
  // Health statuses
  healthy: {
    bg: "bg-green-500/15 border border-green-500/20",
    text: "text-green-400",
  },
  degraded: {
    bg: "bg-yellow-500/15 border border-yellow-500/20",
    text: "text-yellow-400",
  },
  down: {
    bg: "bg-red-500/15 border border-red-500/20",
    text: "text-red-400",
  },
  maintenance: {
    bg: "bg-indigo-500/15 border border-indigo-500/20",
    text: "text-indigo-400",
  },
  unknown: {
    bg: "bg-glass-hover border border-glass-border",
    text: "text-muted-foreground",
  },
};

const FALLBACK = {
  bg: "bg-glass-hover border border-glass-border",
  text: "text-muted-foreground",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const style = STATUS_STYLES[status] ?? FALLBACK;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text} ${className}`}
    >
      {status}
    </span>
  );
}
