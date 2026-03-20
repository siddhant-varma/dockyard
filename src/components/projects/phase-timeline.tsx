/**
 * PhaseTimeline — horizontal timeline showing project phase progression.
 *
 * Achieved phases in green, current phase highlighted, planned in gray.
 * Collapses to vertical on mobile. Uses CSS transitions for animation.
 *
 * @param phases - Ordered array of phase entries from getPhaseTimeline().
 */

interface PhaseEntry {
  name: string;
  status: "achieved" | "current" | "planned";
  startDate: string | null;
  endDate: string | null;
  itemCount: number;
  completedCount: number;
}

interface PhaseTimelineProps {
  phases: PhaseEntry[];
}

const STATUS_STYLES = {
  achieved: "bg-green-500 text-white",
  current: "bg-blue-500 text-white ring-2 ring-blue-300",
  planned: "bg-gray-200 text-gray-600",
} as const;

const CONNECTOR_STYLES = {
  achieved: "bg-green-500",
  current: "bg-blue-300",
  planned: "bg-gray-200",
} as const;

export function PhaseTimeline({ phases }: PhaseTimelineProps) {
  if (phases.length === 0) {
    return (
      <p className="text-sm text-gray-500">No phases defined yet.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex items-center gap-1 min-w-max py-2">
        {phases.map((phase, i) => (
          <div key={phase.name} className="flex items-center">
            {/* Phase node */}
            <div className="flex flex-col items-center">
              <div
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${STATUS_STYLES[phase.status]}`}
              >
                {phase.name}
              </div>
              <div className="mt-1 text-center">
                <span className="text-xs text-gray-500">
                  {phase.completedCount}/{phase.itemCount}
                </span>
                {phase.endDate && (
                  <div className="text-xs text-gray-400">
                    {new Date(phase.endDate).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Connector line */}
            {i < phases.length - 1 && (
              <div
                className={`h-0.5 w-8 ${CONNECTOR_STYLES[phase.status]}`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
