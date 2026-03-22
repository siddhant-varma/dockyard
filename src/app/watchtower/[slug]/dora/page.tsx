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
import { isDemoMode } from "@/lib/env";

type Params = Promise<{ slug: string }>;

interface DORAMetric {
  name: string;
  rating: "elite" | "high" | "medium" | "low";
  value: string;
  trend: "↑" | "→" | "↓";
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
  const metrics = isDemoMode ? DEMO_DORA : [];

  return (
    <div className="space-y-6">
      <PageTabs tabs={buildHealthTabs(slug)} />
      <h1 className="text-lg font-semibold text-foreground">DORA Metrics</h1>

      {metrics.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center">
          <p className="text-sm text-foreground/50">
            Not enough data to calculate DORA metrics.
          </p>
        </div>
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
                  <span className="text-2xl font-bold tabular-nums text-foreground">
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
