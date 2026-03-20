/**
 * Billing summary card for the home dashboard.
 *
 * Shows the current month's estimated spend in EUR broken down by resource type:
 * servers, volumes, floating IPs, load balancers, and traffic overage.
 * Values come from the latest billing estimate row stored in the database.
 *
 * All amounts are displayed as-is from the API; no currency conversion is
 * performed in this component.
 *
 * @example
 * ```tsx
 * <BillingCard billing={billingData} />
 * ```
 */

export interface BillingCardProps {
  /**
   * Latest billing estimate from /api/hetzner/billing.
   * Null when no estimate has been recorded yet (first-run state).
   */
  billing: {
    /** Estimated server compute cost for the current billing period. */
    serverCost: string | null;
    /** Estimated storage volume cost. */
    volumeCost: string | null;
    /** Estimated floating IP cost. */
    ipCost: string | null;
    /** Estimated load balancer cost. */
    lbCost: string | null;
    /** Estimated outbound traffic overage cost. */
    trafficCost: string | null;
    /** Running total of all resource costs. */
    totalCost: string | null;
    /** ISO 8601 timestamp of when this estimate was last calculated. */
    calculatedAt: string;
  } | null;
}

interface LineItem {
  label: string;
  value: string | null;
}

/** Formats a nullable decimal string as a EUR amount. */
function formatEur(value: string | null): string {
  if (value === null || value === undefined) return "—";
  const num = parseFloat(value);
  if (Number.isNaN(num)) return "—";
  return `€${num.toFixed(2)}`;
}

/** Formats an ISO timestamp to a short human-readable date. */
function formatUpdatedAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Renders a single breakdown line with label and EUR value. */
function LineItemRow({ label, value }: LineItem) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">
        {label}
      </span>
      <span className="text-xs font-medium tabular-nums text-foreground/80">
        {formatEur(value)}
      </span>
    </div>
  );
}

/**
 * Renders the billing summary card showing month-to-date spend and a per-resource
 * cost breakdown. Displays a placeholder message when no billing data is available.
 */
export function BillingCard({ billing }: BillingCardProps) {
  if (!billing) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-glass-border bg-glass-bg p-5 backdrop-blur-lg dark:glass">
        <h3 className="text-sm font-semibold text-foreground">
          Billing
        </h3>
        <p className="text-xs text-muted-foreground">
          No billing estimate recorded yet. The first estimate will appear after
          the next background job run.
        </p>
      </div>
    );
  }

  const lineItems: LineItem[] = [
    { label: "Servers", value: billing.serverCost },
    { label: "Volumes", value: billing.volumeCost },
    { label: "Floating IPs", value: billing.ipCost },
    { label: "Load balancers", value: billing.lbCost },
    { label: "Traffic", value: billing.trafficCost },
  ];

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-glass-border bg-glass-bg p-5 backdrop-blur-lg dark:glass">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Billing
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Month-to-date estimate
          </p>
        </div>
        <span className="shrink-0 font-mono text-2xl font-bold tabular-nums text-foreground">
          {formatEur(billing.totalCost)}
        </span>
      </div>

      <div className="space-y-1.5 border-t border-glass-border pt-3">
        {lineItems.map((item) => (
          <LineItemRow key={item.label} label={item.label} value={item.value} />
        ))}
      </div>

      <p className="text-right text-xs text-muted-foreground/60">
        Updated {formatUpdatedAt(billing.calculatedAt)}
      </p>
    </div>
  );
}
