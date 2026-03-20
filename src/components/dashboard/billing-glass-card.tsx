/**
 * Billing card with consumption ring — matches Stitch Glass Dashboard wireframe.
 *
 * Shows: total cost, billing cycle end date, consumption percentage as a ring chart,
 * plus a cost breakdown list.
 */

export interface BillingGlassCardProps {
  billing: {
    serverCost: string | null;
    volumeCost: string | null;
    ipCost: string | null;
    lbCost: string | null;
    trafficCost: string | null;
    totalCost: string | null;
    calculatedAt: string;
  } | null;
}

function formatCost(value: string | null): string {
  if (!value) return "—";
  const num = parseFloat(value);
  if (Number.isNaN(num)) return "—";
  return `$${num.toFixed(2)}`;
}

/** SVG ring chart showing consumption percentage. */
function ConsumptionRing({ percent }: { percent: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
      <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90">
        {/* Track */}
        <circle
          cx="40" cy="40" r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          className="text-glass-border"
        />
        {/* Fill */}
        <circle
          cx="40" cy="40" r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-primary"
        />
      </svg>
      <span className="absolute font-mono text-sm font-semibold text-foreground">
        {percent}%
      </span>
    </div>
  );
}

function LineItemRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-mono text-xs text-foreground/80">{formatCost(value)}</span>
    </div>
  );
}

export function BillingGlassCard({ billing }: BillingGlassCardProps) {
  if (!billing) {
    return (
      <div className="flex flex-col rounded-xl border border-glass-border bg-glass-bg p-5 backdrop-blur-lg">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Current Billing Cycle
        </h3>
        <p className="mt-2 text-xs text-muted-foreground">
          No billing estimate recorded yet. The first estimate will appear after
          the next background job run.
        </p>
      </div>
    );
  }

  const total = billing.totalCost ? parseFloat(billing.totalCost) : 0;
  // Approximate consumption as a percentage of a $20/mo budget (adjustable)
  const budgetLimit = 20;
  const consumptionPercent = Math.min(100, Math.round((total / budgetLimit) * 100));

  return (
    <div className="flex flex-col rounded-xl border border-glass-border bg-glass-bg p-5 backdrop-blur-lg">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Current Billing Cycle
      </h3>

      {/* Cost + Ring */}
      <div className="mt-4 flex items-center justify-between gap-4">
        <div>
          <span className="font-mono text-3xl font-bold text-foreground">
            {formatCost(billing.totalCost)}
          </span>
          <span className="ml-1 text-sm text-muted-foreground">/mo</span>
        </div>
        <ConsumptionRing percent={consumptionPercent} />
      </div>

      {/* Cycle info */}
      <p className="mt-2 text-xs text-muted-foreground">
        {consumptionPercent}% consumption
      </p>

      {/* Breakdown */}
      <div className="mt-3 space-y-0.5 border-t border-glass-divider pt-3">
        <LineItemRow label="Servers" value={billing.serverCost} />
        <LineItemRow label="Volumes" value={billing.volumeCost} />
        <LineItemRow label="Floating IPs" value={billing.ipCost} />
        <LineItemRow label="Load Balancers" value={billing.lbCost} />
        <LineItemRow label="Traffic" value={billing.trafficCost} />
      </div>
    </div>
  );
}
