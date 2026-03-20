/**
 * PhaseTimeline — horizontal timeline showing project phase progression.
 *
 * Achieved phases render green, the current phase pulses blue, and
 * planned phases show as muted glass pills. Collapses to vertical on
 * mobile. Uses CSS transitions for smooth animations.
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
  achieved: "bg-green-500/20 text-green-400 border border-green-500/30",
  current:
    "bg-[var(--color-brand-500)]/20 text-[var(--color-brand-500)] border border-[var(--color-brand-500)]/30 ring-2 ring-[var(--color-brand-500)]/20",
  planned: "bg-glass-bg text-muted-foreground border border-glass-border",
} as const;

const CONNECTOR_STYLES = {
  achieved: "bg-green-500/50",
  current: "bg-[var(--color-brand-500)]/40",
  planned: "bg-glass-border",
} as const;

export function PhaseTimeline({ phases }: PhaseTimelineProps) {
  if (phases.length === 0) {
    return (
      <p className="text-sm text-muted-foreground/60">
        No phases defined yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex items-center gap-1 min-w-max py-2">
        {phases.map((phase, i) => (
          <div key={phase.name} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`rounded-full px-3 py-1.5 text-xs font-medium backdrop-blur-sm transition-all ${STATUS_STYLES[phase.status]}`}
              >
                {phase.name}
              </div>
              <div className="mt-1 text-center">
                <span className="text-xs text-muted-foreground/70">
                  {phase.completedCount}/{phase.itemCount}
                </span>
                {phase.endDate && (
                  <div className="text-xs text-muted-foreground/50">
                    {new Date(phase.endDate).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                )}
              </div>
            </div>

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
