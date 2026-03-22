/**
 * BillingHistory — 6-month bar chart of billing costs.
 *
 * Matches WIREFRAMES.md "Billing History (6mo)" section.
 * Pure CSS bars, no chart library dependency.
 */

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface MonthCost {
  month: string;
  cost: number;
  projected?: boolean;
}

interface BillingHistoryProps {
  data: MonthCost[];
  currency?: string;
}

export function BillingHistory({
  data,
  currency = "$",
}: BillingHistoryProps) {
  const maxCost = Math.max(...data.map((d) => d.cost), 1);

  return (
    <Card className="bg-card border-glass-border backdrop-blur-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Billing History (6mo)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2 h-28">
          {data.map((d) => {
            const heightPct = (d.cost / maxCost) * 100;
            return (
              <div
                key={d.month}
                className="flex flex-1 flex-col items-center gap-1"
              >
                <span className="text-[10px] tabular-nums text-muted-foreground/50">
                  {currency}{d.cost.toFixed(0)}
                </span>
                <div
                  className={`w-full rounded-t ${
                    d.projected
                      ? "bg-[var(--color-brand-500)]/30"
                      : "bg-[var(--color-brand-500)]"
                  }`}
                  style={{ height: `${heightPct}%`, minHeight: 4 }}
                />
                <span className="text-[10px] text-muted-foreground/50">
                  {d.month}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
