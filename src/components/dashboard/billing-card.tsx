/**
 * BillingCard — current billing cycle glass card.
 *
 * Shows monthly cost, breakdown, projected total, cycle end date,
 * and a consumption ring gauge.
 * Matches WIREFRAMES.md "Billing (Current)" section.
 */

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface BillingCardProps {
  totalCost: string | null;
  serverCost: string | null;
  volumeCost: string | null;
  projectedCost?: string | null;
  cycleEnd?: string | null;
  consumptionPct?: number;
}

export function BillingCard({
  totalCost,
  serverCost,
  volumeCost,
  projectedCost,
  cycleEnd,
  consumptionPct = 0,
}: BillingCardProps) {
  const pct = Math.max(0, Math.min(100, consumptionPct));
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <Card className="bg-card border-glass-border backdrop-blur-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Billing (Current)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
          {/* Consumption ring */}
          <svg width="88" height="88" viewBox="0 0 88 88" className="shrink-0">
            <circle
              cx="44" cy="44" r="36"
              fill="none" stroke="currentColor" strokeWidth="5"
              className="text-glass-border"
            />
            <circle
              cx="44" cy="44" r="36"
              fill="none" strokeWidth="5"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="text-[var(--color-brand-500)]"
              transform="rotate(-90 44 44)"
            />
            <text
              x="44" y="44"
              textAnchor="middle" dominantBaseline="central"
              className="fill-foreground text-sm font-bold"
            >
              {pct}%
            </text>
          </svg>

          {/* Details */}
          <div className="space-y-1.5 text-sm">
            <p className="text-lg font-semibold text-foreground">
              {totalCost ?? "$0.00"}
              <span className="text-xs font-normal text-muted-foreground/60">
                /mo
              </span>
            </p>
            <p className="text-xs text-muted-foreground/60">
              Server {serverCost ?? "$0"} · Vol {volumeCost ?? "$0"}
            </p>
            {projectedCost && (
              <p className="text-xs text-muted-foreground/50">
                Projected: {projectedCost}
              </p>
            )}
            {cycleEnd && (
              <p className="text-xs text-muted-foreground/50">
                Cycle ends {cycleEnd}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
