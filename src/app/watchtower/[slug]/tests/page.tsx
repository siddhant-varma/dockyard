/**
 * Watchtower Tests — /watchtower/[slug]/tests
 *
 * Server component. Test suites with recent run results.
 * Fetches test results from GET /api/projects/:slug/tests/results
 * and test configuration from GET /api/projects/:slug/tests/config.
 * In demo mode, renders static DEMO data without API calls.
 * Matches WIREFRAMES.md §11 "Tests Tab".
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTabs } from "@/components/layout/page-tabs";
import { buildHealthTabs } from "@/components/watchtower/watchtower-tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { isDemoMode, isDiagnosticMode } from "@/lib/env";
import { RunTestButton } from "./run-test-button";

type Params = Promise<{ slug: string }>;

interface TestRun {
  passed: boolean;
  duration: string;
  error?: string;
}

interface TestSuite {
  name: string;
  type: "smoke" | "integration" | "e2e";
  trigger: "post-deploy" | "scheduled" | "manual";
  enabled: boolean;
  recentRuns: TestRun[];
}

/** API response shape for GET /api/projects/:slug/tests/results */
interface TestResultsResponse {
  suites: {
    name: string;
    type: string;
    recentRuns: { passed: boolean; durationMs: number; error?: string }[];
  }[];
}

/** API response shape for GET /api/projects/:slug/tests/config */
interface TestConfigResponse {
  suites: {
    name: string;
    type: string;
    trigger: string;
    enabled: boolean;
  }[];
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

const INTERNAL_BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Format milliseconds into a human-readable duration string. */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(0)}s`;
}

/**
 * Fetch test results and config from the API, merge into TestSuite[].
 * Returns an empty array on any failure so the page degrades gracefully.
 */
async function fetchTests(slug: string): Promise<TestSuite[]> {
  if (isDemoMode && !isDiagnosticMode) return DEMO_TESTS;

  try {
    const [resultsRes, configRes] = await Promise.all([
      fetch(`${INTERNAL_BASE}/api/projects/${slug}/tests/results`, {
        next: { revalidate: 15 },
      }),
      fetch(`${INTERNAL_BASE}/api/projects/${slug}/tests/config`, {
        next: { revalidate: 30 },
      }),
    ]);

    if (!resultsRes.ok && !configRes.ok) return [];

    const results: TestResultsResponse = resultsRes.ok
      ? await resultsRes.json()
      : { suites: [] };
    const config: TestConfigResponse = configRes.ok
      ? await configRes.json()
      : { suites: [] };

    // Index config suites by name for O(1) lookup
    const configMap = new Map(
      config.suites.map((s) => [s.name, s]),
    );

    // Merge results with config — results are the primary list
    const merged: TestSuite[] = results.suites.map((rs) => {
      const cfg = configMap.get(rs.name);
      return {
        name: rs.name,
        type: (cfg?.type ?? rs.type) as TestSuite["type"],
        trigger: (cfg?.trigger ?? "manual") as TestSuite["trigger"],
        enabled: cfg?.enabled ?? true,
        recentRuns: rs.recentRuns.map((run) => ({
          passed: run.passed,
          duration: formatDuration(run.durationMs),
          error: run.error,
        })),
      };
    });

    // Add any config-only suites that have no results yet
    for (const [name, cfg] of configMap) {
      if (!results.suites.some((rs) => rs.name === name)) {
        merged.push({
          name,
          type: cfg.type as TestSuite["type"],
          trigger: cfg.trigger as TestSuite["trigger"],
          enabled: cfg.enabled,
          recentRuns: [],
        });
      }
    }

    return merged;
  } catch {
    return [];
  }
}

const TYPE_BADGE: Record<string, string> = {
  smoke: "bg-green-500/15 text-green-300 border-green-500/30",
  integration: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  e2e: "bg-purple-500/15 text-purple-300 border-purple-500/30",
};

export default async function TestsPage({ params }: { params: Params }) {
  const { slug } = await params;
  const tests = await fetchTests(slug);

  return (
    <div className="space-y-6">
      <PageTabs tabs={buildHealthTabs(slug)} />
      <h1 className="text-lg font-semibold text-foreground">Tests</h1>

      {tests.length === 0 ? (
        <EmptyState
          icon="shield"
          title="No test suites defined"
          description="Configure smoke, integration, or e2e test suites to track results here."
        />
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
                    <RunTestButton
                      slug={slug}
                      suiteName={suite.name}
                      isDemo={isDemoMode}
                    />
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
