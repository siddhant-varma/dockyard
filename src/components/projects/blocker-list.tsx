/**
 * BlockerList — active blockers with severity-colored left borders.
 *
 * Matches Stitch "Critical Blockers" section + WIREFRAMES.md blocker list.
 */

import { Badge } from "@/components/ui/badge";

export interface Blocker {
  id: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  owner: string | null;
  context: string;
}

interface BlockerListProps {
  blockers: Blocker[];
}

const SEV_BORDER: Record<string, string> = {
  critical: "border-l-red-400",
  high: "border-l-orange-400",
  medium: "border-l-yellow-400",
  low: "border-l-blue-400",
};

const SEV_BADGE: Record<string, string> = {
  critical: "bg-red-500/20 text-red-300 border-red-500/40",
  high: "bg-orange-500/20 text-orange-300 border-orange-500/40",
  medium: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  low: "bg-blue-500/20 text-blue-300 border-blue-500/40",
};

export function BlockerList({ blockers }: BlockerListProps) {
  if (blockers.length === 0) {
    return (
      <p className="text-sm text-foreground/40">No active blockers.</p>
    );
  }

  return (
    <div className="space-y-2">
      {blockers.map((b) => (
        <div
          key={b.id}
          className={`rounded-lg border border-glass-border border-l-2 bg-card/50 p-3 backdrop-blur-sm ${SEV_BORDER[b.severity]}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Badge
              variant="outline"
              className={`text-[10px] ${SEV_BADGE[b.severity]}`}
            >
              {b.severity}
            </Badge>
            <span className="text-xs text-foreground/40">{b.context}</span>
          </div>
          <p className="text-sm text-foreground/80">{b.title}</p>
          {b.owner && (
            <p className="mt-1 text-[10px] text-foreground/40">
              Owner: {b.owner}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
