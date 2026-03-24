/**
 * Project Roadmap page — /projects/[slug]/roadmap
 *
 * Server component. Vertical phase-by-phase roadmap with task items.
 * Matches WIREFRAMES.md §8 phase timeline (expanded view).
 *
 * In demo mode, renders static DEMO_ROADMAP data.
 * In live mode, fetches from GET /api/projects/:slug/phases.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageTabs } from "@/components/layout/page-tabs";
import { buildProjectTabs } from "@/components/projects/project-tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { isDemoMode, isDiagnosticMode } from "@/lib/env";

type Params = Promise<{ slug: string }>;

const INTERNAL_BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

interface RoadmapPhase {
  name: string;
  status: "complete" | "in-progress" | "planned";
  items: { title: string; done: boolean }[];
}

const DEMO_ROADMAP: RoadmapPhase[] = [
  {
    name: "Phase 0 — Foundation",
    status: "complete",
    items: [
      { title: "Database schema + migrations", done: true },
      { title: "Auth middleware + RBAC", done: true },
      { title: "Project discovery engine", done: true },
    ],
  },
  {
    name: "Phase 1 — MVP",
    status: "complete",
    items: [
      { title: "Health check poller", done: true },
      { title: "Alert evaluation pipeline", done: true },
      { title: "SSE real-time updates", done: true },
      { title: "Config management (CRUD + encryption)", done: true },
    ],
  },
  {
    name: "Phase 2 — Advanced",
    status: "in-progress",
    items: [
      { title: "SLO budget calculator + burn-rate alerts", done: true },
      { title: "DORA metrics dashboard", done: true },
      { title: "AI confidence scoring", done: true },
      { title: "Incident lifecycle + postmortem", done: false },
      { title: "Auto-rollback on health failure", done: false },
    ],
  },
  {
    name: "Phase 3 — Scale",
    status: "planned",
    items: [
      { title: "Multi-VPS support", done: false },
      { title: "Plugin marketplace", done: false },
      { title: "Mobile app (React Native)", done: false },
    ],
  },
];

const PHASE_BADGE: Record<string, string> = {
  complete: "bg-green-500/20 text-green-300 border-green-500/40",
  "in-progress": "bg-[var(--color-brand-500)]/20 text-[var(--color-brand-400)] border-[var(--color-brand-500)]/40",
  planned: "bg-white/5 text-foreground/40 border-white/10",
};

/** Fetch roadmap phases from the backend or return demo data. */
async function fetchPhases(slug: string): Promise<RoadmapPhase[]> {
  if (isDemoMode && !isDiagnosticMode) return DEMO_ROADMAP;
  try {
    const res = await fetch(
      `${INTERNAL_BASE}/api/projects/${slug}/phases`,
      { cache: "no-store" },
    );
    if (!res.ok) return [];
    return (await res.json()) as RoadmapPhase[];
  } catch {
    return [];
  }
}

export default async function RoadmapPage({ params }: { params: Params }) {
  const { slug } = await params;
  const phases = await fetchPhases(slug);

  return (
    <div className="space-y-6">
      <PageTabs tabs={buildProjectTabs(slug)} />
      <h1 className="text-lg font-semibold text-foreground">Roadmap</h1>

      {phases.length === 0 ? (
        <EmptyState
          icon="chart"
          title="No roadmap defined"
          description="Add a roadmap API or enable demo mode to see phase planning."
        />
      ) : (
        <div className="space-y-4">
          {phases.map((phase) => (
            <Card
              key={phase.name}
              className="bg-card border-glass-border backdrop-blur-lg"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{phase.name}</CardTitle>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${PHASE_BADGE[phase.status]}`}
                  >
                    {phase.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {phase.items.map((item) => (
                    <li
                      key={item.title}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span
                        className={`text-xs ${item.done ? "text-green-400" : "text-foreground/20"}`}
                      >
                        {item.done ? "✓" : "○"}
                      </span>
                      <span
                        className={
                          item.done
                            ? "text-foreground/50 line-through"
                            : "text-foreground/70"
                        }
                      >
                        {item.title}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
