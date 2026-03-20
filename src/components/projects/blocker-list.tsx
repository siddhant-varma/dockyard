/**
 * BlockerList — displays active and resolved blockers for a project.
 *
 * Active blockers render as glass cards with a colored left border
 * indicating severity. Resolved blockers collapse into a details element.
 *
 * @param blockers - Blocker entries from the project's roadmap items.
 * @param onResolve - Optional callback when the "Resolve" button is clicked.
 */

"use client";

interface Blocker {
  description: string;
  severity: string;
  owner: string | null;
  created_at: string;
  resolved_at: string | null;
  itemId: string;
  itemTitle: string;
  index: number;
}

interface BlockerListProps {
  blockers: Blocker[];
  onResolve?: (itemId: string, index: number) => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "border-l-red-400 bg-red-500/10",
  high: "border-l-orange-400 bg-orange-500/10",
  medium: "border-l-yellow-400 bg-yellow-500/10",
  low: "border-l-blue-400 bg-blue-500/10",
};

const SEVERITY_BADGE: Record<string, string> = {
  critical: "bg-red-500/15 text-red-400 border-red-500/20",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  low: "bg-blue-500/15 text-blue-400 border-blue-500/20",
};

export function BlockerList({ blockers, onResolve }: BlockerListProps) {
  const active = blockers.filter((b) => !b.resolved_at);
  const resolved = blockers.filter((b) => b.resolved_at);

  if (blockers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground/60">
        No blockers — clear sailing.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {active.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            Active ({active.length})
          </h4>
          {active.map((blocker) => (
            <div
              key={`${blocker.itemId}-${blocker.index}`}
              className={`flex items-start justify-between rounded-lg border border-glass-border border-l-2 p-3 backdrop-blur-sm ${SEVERITY_COLORS[blocker.severity] ?? SEVERITY_COLORS.medium}`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-medium ${SEVERITY_BADGE[blocker.severity] ?? SEVERITY_BADGE.medium}`}
                  >
                    {blocker.severity}
                  </span>
                  <span className="text-xs text-muted-foreground/60">
                    on {blocker.itemTitle}
                  </span>
                </div>
                <p className="mt-1 text-sm text-foreground/80">
                  {blocker.description}
                </p>
                {blocker.owner && (
                  <span className="mt-1 text-xs text-muted-foreground/50">
                    Owner: {blocker.owner}
                  </span>
                )}
              </div>
              {onResolve && (
                <button
                  onClick={() => onResolve(blocker.itemId, blocker.index)}
                  className="ml-3 shrink-0 text-xs text-green-400 hover:text-green-300 transition-colors"
                >
                  Resolve
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-muted-foreground/50 hover:text-muted-foreground/70 transition-colors">
            Resolved ({resolved.length})
          </summary>
          <div className="mt-2 space-y-1">
            {resolved.map((blocker) => (
              <div
                key={`${blocker.itemId}-${blocker.index}`}
                className="rounded-lg bg-glass-bg p-2 text-xs text-muted-foreground/40 line-through border border-glass-border/50"
              >
                {blocker.description}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
