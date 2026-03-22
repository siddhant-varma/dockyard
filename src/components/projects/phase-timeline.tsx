/**
 * PhaseTimeline — horizontal phase progression indicator.
 *
 * Achieved phases: green, current: blue pulse, planned: muted.
 * Matches Stitch wireframe "Mission Phases" + WIREFRAMES.md phase timeline.
 */

import { Badge } from "@/components/ui/badge";

export interface PhaseEntry {
  name: string;
  status: "achieved" | "current" | "planned";
  completedCount: number;
  itemCount: number;
}

interface PhaseTimelineProps {
  phases: PhaseEntry[];
}

const NODE_STYLES = {
  achieved: "bg-green-500/20 text-green-300 border-green-500/40",
  current: "bg-[var(--color-brand-500)]/20 text-[var(--color-brand-400)] border-[var(--color-brand-500)]/40 ring-1 ring-[var(--color-brand-500)]/20",
  planned: "bg-white/5 text-foreground/40 border-white/10",
} as const;

const LINE_STYLES = {
  achieved: "bg-green-500/50",
  current: "bg-[var(--color-brand-500)]/30",
  planned: "bg-white/10",
} as const;

export function PhaseTimeline({ phases }: PhaseTimelineProps) {
  if (phases.length === 0) {
    return (
      <p className="text-sm text-foreground/40">No phases defined.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex items-center gap-1 min-w-max py-2">
        {phases.map((phase, i) => (
          <div key={phase.name} className="flex items-center">
            <div className="flex flex-col items-center">
              <Badge
                variant="outline"
                className={`text-xs ${NODE_STYLES[phase.status]}`}
              >
                {phase.name}
              </Badge>
              <span className="mt-1 text-[10px] text-foreground/40">
                {phase.completedCount}/{phase.itemCount}
              </span>
            </div>
            {i < phases.length - 1 && (
              <div className={`h-0.5 w-8 ${LINE_STYLES[phase.status]}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
