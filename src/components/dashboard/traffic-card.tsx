/**
 * TrafficCard — network traffic usage with progress bar.
 *
 * Matches WIREFRAMES.md "Traffic Usage" section.
 * Shows inbound/outbound totals, usage bar, and overage warning.
 */

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface TrafficCardProps {
  inboundGb: number;
  outboundGb: number;
  limitGb: number;
  projectedOverageGb?: number;
}

export function TrafficCard({
  inboundGb,
  outboundGb,
  limitGb,
  projectedOverageGb,
}: TrafficCardProps) {
  const totalGb = inboundGb + outboundGb;
  const usagePct = Math.min(100, (totalGb / limitGb) * 100);

  return (
    <Card className="bg-card border-glass-border backdrop-blur-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Traffic Usage</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-4 text-sm">
          <span className="text-muted-foreground/70">
            In: <span className="text-foreground">{inboundGb}GB</span>
          </span>
          <span className="text-muted-foreground/70">
            Out: <span className="text-foreground">{outboundGb}GB</span>
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-glass-border">
          <div
            className="h-full rounded-full bg-[var(--color-brand-500)] transition-all"
            style={{ width: `${usagePct}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground/50">
          <span>{usagePct.toFixed(0)}% of {limitGb}GB</span>
          {projectedOverageGb != null && projectedOverageGb > 0 && (
            <span className="text-yellow-400">
              Projected overage: +{projectedOverageGb}GB
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
