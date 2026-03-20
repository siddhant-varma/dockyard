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
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-300",
  },
  discovery: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-300",
  },
  active: {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-700 dark:text-green-300",
  },
  paused: {
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    text: "text-yellow-700 dark:text-yellow-300",
  },
  completed: {
    bg: "bg-neutral-100 dark:bg-neutral-800",
    text: "text-neutral-600 dark:text-neutral-400",
  },
  archived: {
    bg: "bg-neutral-100 dark:bg-neutral-800",
    text: "text-neutral-500 dark:text-neutral-500",
  },
  // Health statuses
  healthy: {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-700 dark:text-green-300",
  },
  degraded: {
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    text: "text-yellow-700 dark:text-yellow-300",
  },
  down: {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-300",
  },
  maintenance: {
    bg: "bg-indigo-100 dark:bg-indigo-900/30",
    text: "text-indigo-700 dark:text-indigo-300",
  },
  unknown: {
    bg: "bg-neutral-100 dark:bg-neutral-800",
    text: "text-neutral-500 dark:text-neutral-500",
  },
};

const FALLBACK = {
  bg: "bg-neutral-100 dark:bg-neutral-800",
  text: "text-neutral-600 dark:text-neutral-400",
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
