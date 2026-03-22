/**
 * ConfidenceBreakdown — factor-by-factor confidence score bars.
 *
 * Matches WIREFRAMES.md confidence section and Stitch "Metric Matrix".
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface ConfidenceFactors {
  velocity: number;
  blockers: number;
  recency: number;
  health: number;
  overall: number;
  decaying: boolean;
}

interface ConfidenceBreakdownProps {
  factors: ConfidenceFactors;
}

const ROWS = [
  { key: "velocity" as const, label: "Velocity", positive: true },
  { key: "blockers" as const, label: "Blockers", positive: false },
  { key: "recency" as const, label: "Recency", positive: false },
  { key: "health" as const, label: "Health", positive: false },
];

export function ConfidenceBreakdown({ factors }: ConfidenceBreakdownProps) {
  return (
    <Card className="bg-card border-glass-border backdrop-blur-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Confidence</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {ROWS.map((row) => {
          const value = factors[row.key];
          const display = row.positive
            ? `+${Math.round(value * 100)}%`
            : value > 0
              ? `-${Math.round(value * 100)}%`
              : "0%";
          const color = row.positive
            ? "text-green-400"
            : value > 0
              ? "text-red-400"
              : "text-foreground/30";

          return (
            <div key={row.key} className="flex items-center justify-between text-sm">
              <span className="text-foreground/60">{row.label}</span>
              <span className={`font-mono text-xs font-medium ${color}`}>
                {display}
              </span>
            </div>
          );
        })}

        <div className="flex items-center justify-between border-t border-glass-border pt-2 text-sm">
          <span className="font-medium text-foreground">Overall</span>
          <span className="font-mono font-bold text-foreground">
            {Math.round(factors.overall * 100)}%
          </span>
        </div>

        {factors.decaying && (
          <p className="text-[10px] text-yellow-400">
            Score is decaying — add a checkpoint to refresh.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
