/**
 * Project SLO dashboard page — /projects/[slug]/slo
 *
 * Server component. Fetches SLO definitions and renders budget gauges
 * with burn rate indicators. Glass Observatory styling.
 */

type Params = Promise<{ slug: string }>;

interface SloDefinition {
  id: string;
  name: string;
  target: number;
  window: number;
  budgetRemaining: number;
  burnRate: number;
  status: "ok" | "warning" | "critical";
}

const INTERNAL_BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

async function fetchSlos(slug: string): Promise<SloDefinition[]> {
  try {
    const res = await fetch(`${INTERNAL_BASE}/api/projects/${slug}/slo`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json() as Promise<SloDefinition[]>;
  } catch {
    return [];
  }
}

const STATUS_COLORS = {
  ok: { ring: "stroke-green-400", text: "text-green-400", bg: "bg-green-500/10" },
  warning: { ring: "stroke-yellow-400", text: "text-yellow-400", bg: "bg-yellow-500/10" },
  critical: { ring: "stroke-red-400", text: "text-red-400", bg: "bg-red-500/10" },
} as const;

function BudgetGauge({ remaining, status }: { remaining: number; status: "ok" | "warning" | "critical" }) {
  const pct = Math.max(0, Math.min(100, remaining));
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (pct / 100) * circumference;
  const colors = STATUS_COLORS[status];

  return (
    <svg width="96" height="96" viewBox="0 0 96 96" className="shrink-0">
      <circle cx="48" cy="48" r="40" fill="none" stroke="currentColor" strokeWidth="6" className="text-glass-border" />
      <circle
        cx="48" cy="48" r="40" fill="none" strokeWidth="6"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className={colors.ring}
        transform="rotate(-90 48 48)"
      />
      <text x="48" y="48" textAnchor="middle" dominantBaseline="central" className={`text-lg font-bold ${colors.text}`} fill="currentColor">
        {pct}%
      </text>
    </svg>
  );
}

export default async function SloPage({ params }: { params: Params }) {
  const { slug } = await params;
  const slos = await fetchSlos(slug);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Service Level Objectives
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground/70">
            Budget tracking and burn rate monitoring.
          </p>
        </div>
      </div>

      {slos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-glass-border-strong bg-glass-bg py-16 text-center backdrop-blur-sm">
          <p className="text-sm text-muted-foreground">
            No SLOs defined yet.
          </p>
          <p className="mt-1 text-xs text-muted-foreground/50">
            Create SLO definitions to track availability and performance budgets.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {slos.map((slo) => {
            const colors = STATUS_COLORS[slo.status];
            return (
              <div
                key={slo.id}
                className="flex items-center gap-4 rounded-xl border border-glass-border bg-glass-bg p-5 backdrop-blur-sm"
              >
                <BudgetGauge remaining={slo.budgetRemaining} status={slo.status} />
                <div className="flex-1 space-y-1">
                  <h3 className="text-sm font-semibold text-foreground">
                    {slo.name}
                  </h3>
                  <p className="text-xs text-muted-foreground/60">
                    Target: {(slo.target * 100).toFixed(2)}% over {slo.window}d
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground/70">
                      Burn rate:
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text}`}
                    >
                      {slo.burnRate.toFixed(1)}x
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
