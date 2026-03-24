/**
 * Watchtower Deployments — /watchtower/[slug]/deployments
 *
 * Server component. Deployment history timeline.
 * Matches WIREFRAMES.md §11 "Deployments Tab".
 *
 * In demo mode, renders static demo data. In live mode, fetches from the
 * deployments API. Interactive Diff/Rollback buttons are handled by the
 * `DeploymentActions` client component.
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageTabs } from "@/components/layout/page-tabs";
import { buildHealthTabs } from "@/components/watchtower/watchtower-tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { isDemoMode, isDiagnosticMode } from "@/lib/env";
import { DeploymentActions } from "./deployment-actions";

type Params = Promise<{ slug: string }>;

const INTERNAL_BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

interface Deployment {
  id: string;
  version: string;
  commitHash: string;
  message: string;
  duration: string;
  status: "success" | "failed" | "rolled-back";
}

/** Raw deployment record from the API (mirrors the DB schema). */
interface ApiDeployment {
  id: string;
  version: string | null;
  commitSha: string | null;
  commitMessage: string | null;
  status: string;
  durationSecs: number | null;
  deployedAt: string;
}

const DEMO_DEPLOYS: Deployment[] = [
  { id: "d1", version: "v1.2.3", commitHash: "abc1234", message: "feat: dashboard rebuild", duration: "45s", status: "success" },
  { id: "d2", version: "v1.2.2", commitHash: "xyz7890", message: "fix: memory leak in SSE", duration: "38s", status: "success" },
  { id: "d3", version: "v1.2.1", commitHash: "bad4567", message: "broken migration", duration: "120s", status: "failed" },
  { id: "d4", version: "v1.2.0", commitHash: "def9012", message: "feat: alert rules engine", duration: "52s", status: "success" },
  { id: "d5", version: "v1.1.9", commitHash: "ghi3456", message: "fix: config encryption", duration: "41s", status: "rolled-back" },
];

const STATUS_ICON: Record<string, { symbol: string; color: string }> = {
  success: { symbol: "\u2713", color: "text-green-400" },
  failed: { symbol: "\u2717", color: "text-red-400" },
  "rolled-back": { symbol: "\u21A9", color: "text-yellow-400" },
  rolled_back: { symbol: "\u21A9", color: "text-yellow-400" },
};

const STATUS_BADGE: Record<string, string> = {
  success: "bg-green-500/15 text-green-300 border-green-500/30",
  failed: "bg-red-500/15 text-red-300 border-red-500/30",
  "rolled-back": "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  rolled_back: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
};

/** Normalize DB status values (e.g. `rolled_back`) to display values (`rolled-back`). */
function normalizeStatus(status: string): Deployment["status"] {
  if (status === "rolled_back") return "rolled-back";
  if (status === "success" || status === "failed") return status;
  return "failed";
}

/**
 * Fetch deployment history for a project.
 *
 * In demo mode returns static sample data. In live mode calls
 * `GET /api/projects/:slug/deployments` and maps the API response
 * to the local `Deployment` shape.
 */
async function fetchDeployments(slug: string): Promise<Deployment[]> {
  if (isDemoMode && !isDiagnosticMode) return DEMO_DEPLOYS;

  try {
    const res = await fetch(
      `${INTERNAL_BASE}/api/projects/${slug}/deployments`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];

    const data: ApiDeployment[] = await res.json();

    return data.map((d) => ({
      id: d.id,
      version: d.version ?? "unknown",
      commitHash: d.commitSha ? d.commitSha.slice(0, 7) : "—",
      message: d.commitMessage ?? "",
      duration: d.durationSecs != null ? `${d.durationSecs}s` : "—",
      status: normalizeStatus(d.status),
    }));
  } catch {
    return [];
  }
}

export default async function DeploymentsPage({ params }: { params: Params }) {
  const { slug } = await params;
  const deploys = await fetchDeployments(slug);

  return (
    <div className="space-y-6">
      <PageTabs tabs={buildHealthTabs(slug)} />
      <h1 className="text-lg font-semibold text-foreground">Deployments</h1>

      {deploys.length === 0 ? (
        <EmptyState
          icon="server"
          title="No deployments recorded"
          description="Deployments will appear here once your project has its first deploy via Dokploy."
        />
      ) : (
        <div className="space-y-3">
          {deploys.map((d) => {
            const icon = STATUS_ICON[d.status] ?? STATUS_ICON.failed;
            return (
              <Card
                key={d.id}
                className="bg-card border-glass-border backdrop-blur-lg"
              >
                <CardContent className="py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className={`mt-0.5 text-sm font-bold ${icon.color}`}>
                        {icon.symbol}
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-foreground/80">
                            {d.version}
                          </span>
                          <span className="font-mono text-xs text-foreground/40">
                            {d.commitHash}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${STATUS_BADGE[d.status] ?? ""}`}
                          >
                            {d.status}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-foreground/50">
                          &quot;{d.message}&quot; — {d.duration}
                        </p>
                      </div>
                    </div>
                    <DeploymentActions
                      slug={slug}
                      deploymentId={d.id}
                      showRollback={d.status === "success"}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
