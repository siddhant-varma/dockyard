/**
 * Project AI Insights page — /projects/[slug]/insights
 *
 * Server component. AI-generated summaries and predictions.
 * Matches Stitch "AI Insights" section from combined wireframe.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageTabs } from "@/components/layout/page-tabs";
import { buildProjectTabs } from "@/components/projects/project-tabs";
import { isDemoMode } from "@/lib/env";

type Params = Promise<{ slug: string }>;

interface InsightEntry {
  id: string;
  title: string;
  dateRange: string;
  summary: string;
  generatedAt: string;
}

const DEMO_INSIGHTS: InsightEntry[] = [
  {
    id: "ins-1",
    title: "Weekly Summary",
    dateRange: "Mar 14 – 20, 2026",
    summary:
      "Development velocity increased 15% this week with 23 commits merged. " +
      "The database connection pool issue (B-204) remains the primary blocker. " +
      "Infrastructure costs are stable at €14.72/mo. Phase 2 is 71% complete — " +
      "at current velocity, estimated completion is April 8. Risk: the Redis " +
      "cache timeout could delay the SLO dashboard by 3-5 days if not resolved.",
    generatedAt: "Mon 09:00",
  },
  {
    id: "ins-2",
    title: "Phase 1 Retrospective",
    dateRange: "Completed Oct 24, 2025",
    summary:
      "Phase 1 delivered 73 tasks across 13 sessions. System stability reached " +
      "99.98% uptime after initial turbulence. Development efficiency improved " +
      "22% compared to Phase 0, driven by the CI/CD pipeline automation and " +
      "standardized PR review process.",
    generatedAt: "Auto-generated",
  },
];

export default async function InsightsPage({ params }: { params: Params }) {
  const { slug } = await params;
  const insights = isDemoMode ? DEMO_INSIGHTS : [];

  return (
    <div className="space-y-6">
      <PageTabs tabs={buildProjectTabs(slug)} />
      <h1 className="text-lg font-semibold text-foreground">AI Insights</h1>

      {insights.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center">
          <p className="text-sm text-foreground/50">
            No insights generated yet.
          </p>
          <p className="mt-1 text-xs text-foreground/30">
            Insights are generated automatically once the project has enough
            activity data.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {insights.map((insight) => (
            <Card
              key={insight.id}
              className="bg-card border-glass-border backdrop-blur-lg"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{insight.title}</CardTitle>
                  <Badge variant="outline" className="text-[10px]">
                    {insight.dateRange}
                  </Badge>
                </div>
                <p className="text-[10px] text-foreground/30">
                  Generated: {insight.generatedAt}
                </p>
              </CardHeader>
              <CardContent>
                <p className="max-w-prose text-sm leading-relaxed text-foreground/60">
                  {insight.summary}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
