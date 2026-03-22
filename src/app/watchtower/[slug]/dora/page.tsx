/**
 * Watchtower DORA Metrics — /watchtower/[slug]/dora
 *
 * Server component. Four DORA metric cards.
 * Matches WIREFRAMES.md §11 "DORA Tab".
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageTabs } from "@/components/layout/page-tabs";
import { buildHealthTabs } from "@/components/watchtower/watchtower-tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { isDemoMode } from "@/lib/env";

type Params = Promise<{ slug: string }>;

const INTERNAL_BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

interface DORAMetric {
  name: string;
  rating: "elite" | "high" | "medium" | "low";
  value: string;
  trend: "↑" | "→" | "↓";
}

/** API response shape from GET /api/projects/:slug/dora */
interface ApiDORAResponse {
  deployFrequency: { value: number; unit: string; rating: string; trend: string };
  leadTime: { value: number; unit: string; rating: string; trend: string };
  mttr: { value: number; unit: string; rating: string; trend: string };
  changeFailureRate: { value: number; unit: string; rating: string; trend: string };
}

/** Map trend string from API to display arrow */
function mapTrend(trend: string): "↑" | "→" | "↓" {
  if (trend === "up" || trend === "improving") return "↑";
  if (trend === "down" || trend === "degrading") return "↓";
  return "→";
}

/** Map rating string from API to typed rating */
function mapRating(rating: string): "elite" | "high" | "medium" | "low" {
  if (rating === "elite") return "elite";
  if (rating === "high") return "high";
  if (rating === "medium") return "medium";
  return "low";
}

/**
 * Fetch DORA metrics for a project.
 * In demo mode, returns static sample data. In live mode, fetches from the API.
 */
async function fetchDORA(slug: string): Promise<DORAMetric[]> {
  if (isDemoMode) return DEMO_DORA;

  try {
    const res = await fetch(`${INTERNAL_BASE}/api/projects/${slug}/dora`, {
      cache: "no-store",
    });

    if (!res.ok) return [];

    const data: ApiDORAResponse = await res.json();
    return [
      {
        name: "Deploy Frequency",
        rating: mapRating(data.deployFrequency.rating),
        value: `${data.deployFrequency.value}/${data.deployFrequency.unit}`,
        trend: mapTrend(data.deployFrequency.trend),
      },
      {
        name: "Lead Time",
        rating: mapRating(data.leadTime.rating),
        value: `${data.leadTime.value}${data.leadTime.unit}`,
        trend: mapTrend(data.leadTime.trend),
      },
      {
        name: "MTTR",
        rating: mapRating(data.mttr.rating),
        value: `${data.mttr.value}${data.mttr.unit}`,
        trend: mapTrend(data.mttr.trend),
      },
      {
        name: "Change Failure Rate",
        rating: mapRating(data.changeFailureRate.rating),
        value: `${data.changeFailureRate.value}${data.changeFailureRate.unit}`,
        trend: mapTrend(data.changeFailureRate.trend),
      },
    ];
  } catch {
    return [];
  }
}

const DEMO_DORA: DORAMetric[] = [
  { name: "Deploy Frequency", rating: "elite", value: "2.3/day", trend: "↑" },
  { name: "Lead Time", rating: "high", value: "4.2h", trend: "→" },
  { name: "MTTR", rating: "high", value: "23min", trend: "↓" },
  { name: "Change Failure Rate", rating: "elite", value: "3.2%", trend: "→" },
];

const RATING_BADGE: Record<string, string> = {
  elite: "bg-green-500/15 text-green-300 border-green-500/30",
  high: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  medium: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  low: "bg-red-500/15 text-red-300 border-red-500/30",
};

const TREND_COLOR: Record<string, string> = {
  "↑": "text-green-400",
  "→": "text-foreground/40",
  "↓": "text-red-400",
};

export default async function DORAPage({ params }: { params: Params }) {
  const { slug } = await params;
  const metrics = await fetchDORA(slug);

  return (
    <div className="space-y-6">
      <PageTabs tabs={buildHealthTabs(slug)} />
      <h1 className="text-lg font-semibold text-foreground">DORA Metrics</h1>

      {metrics.length === 0 ? (
        <EmptyState
          icon="chart"
          title="Not enough data to calculate DORA metrics"
          description="DORA metrics require deployment and incident data to generate insights."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {metrics.map((m) => (
            <Card
              key={m.name}
              className="bg-card border-glass-border backdrop-blur-lg"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{m.name}</CardTitle>
                  <Badge
                    variant="outline"
                    className={`text-[10px] capitalize ${RATING_BADGE[m.rating]}`}
                  >
                    {m.rating}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2">
                  <span className="font-data text-2xl font-bold tabular-nums text-foreground">
                    {m.value}
                  </span>
                  <span className={`text-lg ${TREND_COLOR[m.trend]}`}>
                    {m.trend}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
