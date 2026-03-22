/**
 * Watchtower Deployments — /watchtower/[slug]/deployments
 *
 * Server component. Deployment history timeline.
 * Matches WIREFRAMES.md §11 "Deployments Tab".
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageTabs } from "@/components/layout/page-tabs";
import { buildHealthTabs } from "@/components/watchtower/watchtower-tabs";
import { isDemoMode } from "@/lib/env";

type Params = Promise<{ slug: string }>;

interface Deployment {
  id: string;
  version: string;
  commitHash: string;
  message: string;
  duration: string;
  status: "success" | "failed" | "rolled-back";
}

const DEMO_DEPLOYS: Deployment[] = [
  { id: "d1", version: "v1.2.3", commitHash: "abc1234", message: "feat: dashboard rebuild", duration: "45s", status: "success" },
  { id: "d2", version: "v1.2.2", commitHash: "xyz7890", message: "fix: memory leak in SSE", duration: "38s", status: "success" },
  { id: "d3", version: "v1.2.1", commitHash: "bad4567", message: "broken migration", duration: "120s", status: "failed" },
  { id: "d4", version: "v1.2.0", commitHash: "def9012", message: "feat: alert rules engine", duration: "52s", status: "success" },
  { id: "d5", version: "v1.1.9", commitHash: "ghi3456", message: "fix: config encryption", duration: "41s", status: "rolled-back" },
];

const STATUS_ICON: Record<string, { symbol: string; color: string }> = {
  success: { symbol: "✓", color: "text-green-400" },
  failed: { symbol: "✗", color: "text-red-400" },
  "rolled-back": { symbol: "↩", color: "text-yellow-400" },
};

const STATUS_BADGE: Record<string, string> = {
  success: "bg-green-500/15 text-green-300 border-green-500/30",
  failed: "bg-red-500/15 text-red-300 border-red-500/30",
  "rolled-back": "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
};

export default async function DeploymentsPage({ params }: { params: Params }) {
  const { slug } = await params;
  const deploys = isDemoMode ? DEMO_DEPLOYS : [];

  return (
    <div className="space-y-6">
      <PageTabs tabs={buildHealthTabs(slug)} />
      <h1 className="text-lg font-semibold text-foreground">Deployments</h1>

      {deploys.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center">
          <p className="text-sm text-foreground/50">No deployments recorded.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {deploys.map((d) => {
            const icon = STATUS_ICON[d.status];
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
                            className={`text-[10px] ${STATUS_BADGE[d.status]}`}
                          >
                            {d.status}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-foreground/50">
                          &quot;{d.message}&quot; — {d.duration}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="text-xs">
                        Diff
                      </Button>
                      {d.status === "success" && (
                        <Button variant="outline" size="sm" className="text-xs">
                          Rollback
                        </Button>
                      )}
                    </div>
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
