/**
 * BlockerList — displays active and resolved blockers for a project.
 *
 * Shows blocker description, severity badge, owner, and resolve button.
 * Includes an inline form to add new blockers.
 *
 * @param projectSlug - The project's URL slug for API calls.
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
  critical: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-blue-100 text-blue-800",
};

export function BlockerList({ blockers, onResolve }: BlockerListProps) {
  const active = blockers.filter((b) => !b.resolved_at);
  const resolved = blockers.filter((b) => b.resolved_at);

  if (blockers.length === 0) {
    return (
      <p className="text-sm text-gray-500">No blockers — clear sailing.</p>
    );
  }

  return (
    <div className="space-y-4">
      {active.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase text-gray-500">
            Active ({active.length})
          </h4>
          {active.map((blocker) => (
            <div
              key={`${blocker.itemId}-${blocker.index}`}
              className="flex items-start justify-between rounded-lg border p-3"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_COLORS[blocker.severity] ?? SEVERITY_COLORS.medium}`}
                  >
                    {blocker.severity}
                  </span>
                  <span className="text-xs text-gray-500">
                    on {blocker.itemTitle}
                  </span>
                </div>
                <p className="mt-1 text-sm">{blocker.description}</p>
                {blocker.owner && (
                  <span className="mt-1 text-xs text-gray-500">
                    Owner: {blocker.owner}
                  </span>
                )}
              </div>
              {onResolve && (
                <button
                  onClick={() => onResolve(blocker.itemId, blocker.index)}
                  className="ml-3 shrink-0 text-xs text-green-600 hover:text-green-800"
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
          <summary className="cursor-pointer text-xs font-semibold uppercase text-gray-400">
            Resolved ({resolved.length})
          </summary>
          <div className="mt-2 space-y-1">
            {resolved.map((blocker) => (
              <div
                key={`${blocker.itemId}-${blocker.index}`}
                className="rounded bg-gray-50 p-2 text-xs text-gray-500 line-through"
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
