/**
 * Project AI Insights page — /projects/[slug]/insights
 *
 * Server component. AI-generated summaries and predictions.
 * Fetches from GET /api/projects/:slug/summaries in live mode.
 * Matches Stitch "AI Insights" section from combined wireframe.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageTabs } from "@/components/layout/page-tabs";
import { buildProjectTabs } from "@/components/projects/project-tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { ContextHandoff } from "@/components/projects/context-handoff";
import { isDemoMode, isDiagnosticMode } from "@/lib/env";

type Params = Promise<{ slug: string }>;

interface InsightEntry {
  id: string;
  title: string;
  dateRange: string;
  summary: string;
  generatedAt: string;
}

/** Shape returned by GET /api/projects/:slug/summaries */
interface ApiSnapshot {
  id: string;
  projectId: string;
  snapshotType?: string;
  title?: string;
  summary?: string;
  content?: string;
  dateRange?: string;
  generatedAt: string;
  createdAt?: string;
}

const DEMO_INSIGHTS: InsightEntry[] = [
  {
    id: "ins-1",
    title: "Weekly Summary",
    dateRange: "Mar 14 \u2013 20, 2026",
    summary:
      "Development velocity increased 15% this week with 23 commits merged. " +
      "The database connection pool issue (B-204) remains the primary blocker. " +
      "Infrastructure costs are stable at \u20AC14.72/mo. Phase 2 is 71% complete \u2014 " +
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

const INTERNAL_BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Map an API snapshot to the display InsightEntry shape. */
function toInsight(api: ApiSnapshot): InsightEntry {
  return {
    id: api.id,
    title: api.title ?? api.snapshotType ?? "Summary",
    dateRange: api.dateRange ?? "",
    summary: api.summary ?? api.content ?? "",
    generatedAt: api.generatedAt
      ? new Date(api.generatedAt).toLocaleDateString("en-US", {
          weekday: "short",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Auto-generated",
  };
}

/** Fetch AI summaries from the backend or return demo data. */
async function fetchInsights(slug: string): Promise<InsightEntry[]> {
  if (isDemoMode && !isDiagnosticMode) return DEMO_INSIGHTS;
  try {
    const res = await fetch(
      `${INTERNAL_BASE}/api/projects/${slug}/summaries`,
      { cache: "no-store" },
    );
    if (!res.ok) return [];
    const data = await res.json();
    const items: ApiSnapshot[] = data.data ?? data;
    return items.map(toInsight);
  } catch {
    return [];
  }
}

export default async function InsightsPage({ params }: { params: Params }) {
  const { slug } = await params;
  const insights = await fetchInsights(slug);

  return (
    <div className="space-y-6">
      <PageTabs tabs={buildProjectTabs(slug)} />
      <h1 className="text-lg font-semibold text-foreground">AI Insights</h1>

      {insights.length === 0 ? (
        <EmptyState
          icon="search"
          title="No insights generated yet"
          description="Insights are generated automatically once the project has enough activity data."
        />
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

      {/* Context Handoff block */}
      <ContextHandoff slug={slug} />
    </div>
  );
}
