/**
 * Watchtower Tests — /watchtower/[slug]/tests
 *
 * Server component. Test suites with recent run results.
 * Matches WIREFRAMES.md §11 "Tests Tab".
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTabs } from "@/components/layout/page-tabs";
import { buildHealthTabs } from "@/components/watchtower/watchtower-tabs";
import { isDemoMode } from "@/lib/env";

type Params = Promise<{ slug: string }>;

interface TestSuite {
  name: string;
  type: "smoke" | "integration" | "e2e";
  trigger: "post-deploy" | "scheduled" | "manual";
  enabled: boolean;
  recentRuns: { passed: boolean; duration: string; error?: string }[];
}

const DEMO_TESTS: TestSuite[] = [
  {
    name: "API Health",
    type: "smoke",
    trigger: "post-deploy",
    enabled: true,
    recentRuns: [
      { passed: true, duration: "2s" },
      { passed: true, duration: "1s" },
      { passed: false, duration: "5s", error: "/api/billing 500" },
    ],
  },
  {
    name: "Auth Flow",
    type: "integration",
    trigger: "post-deploy",
    enabled: true,
    recentRuns: [
      { passed: true, duration: "8s" },
      { passed: true, duration: "7s" },
    ],
  },
  {
    name: "Critical Path",
    type: "e2e",
    trigger: "scheduled",
    enabled: false,
    recentRuns: [
      { passed: true, duration: "45s" },
    ],
  },
];

const TYPE_BADGE: Record<string, string> = {
  smoke: "bg-green-500/15 text-green-300 border-green-500/30",
  integration: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  e2e: "bg-purple-500/15 text-purple-300 border-purple-500/30",
};

export default async function TestsPage({ params }: { params: Params }) {
  const { slug } = await params;
  const tests = isDemoMode ? DEMO_TESTS : [];

  return (
    <div className="space-y-6">
      <PageTabs tabs={buildHealthTabs(slug)} />
      <h1 className="text-lg font-semibold text-foreground">Tests</h1>

      {tests.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center">
          <p className="text-sm text-foreground/50">No test suites defined.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tests.map((suite) => (
            <Card
              key={suite.name}
              className="bg-card border-glass-border backdrop-blur-lg"
            >
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm">{suite.name}</CardTitle>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${TYPE_BADGE[suite.type]}`}
                    >
                      {suite.type}
                    </Badge>
                    <span className="text-[10px] text-foreground/30">
                      {suite.trigger}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${suite.enabled ? "bg-green-400" : "bg-foreground/20"}`}
                    />
                    <span className="text-[10px] text-foreground/40">
                      {suite.enabled ? "Enabled" : "Disabled"}
                    </span>
                    <Button variant="outline" size="sm" className="text-xs">
                      Run Now
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {suite.recentRuns.map((run, i) => (
                    <div
                      key={i}
                      className={`rounded border px-2 py-1 text-[10px] font-mono ${
                        run.passed
                          ? "border-green-500/30 text-green-400"
                          : "border-red-500/30 text-red-400"
                      }`}
                    >
                      {run.passed ? "✓" : "✗"} {run.duration}
                      {run.error && (
                        <span className="ml-1 text-red-400/60">
                          {run.error}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
