/**
 * Project health detail page — /watchtower/[slug]
 *
 * Server component. Fetches health detail for a single project and renders
 * tabbed sections: Health (default), Deployments, DORA, Tests, Logs.
 * Wires all Phase 2 components: deploy diff, rollback, DORA dashboard.
 * Glass Observatory styling.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { LiveHealthDetail } from "@/components/watchtower/live-health-detail";
import { DeploymentTimeline } from "@/components/watchtower/deployment-timeline";
import { DoraDashboard } from "@/components/watchtower/dora-dashboard";
import { StatusBadge } from "@/components/shared";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<{ tab?: string }>;

interface ComponentHealth {
  name: string;
  status: string;
  latencyMs: number | null;
}

interface HealthDetail {
  project: { id: string; name: string; slug: string };
  health: { overallStatus: string; components: unknown };
  uptime: number | null;
  recentChecks: unknown[];
}

interface DeploymentEvent {
  id: string;
  status: string;
  commitSha: string | null;
  commitMessage: string | null;
  triggeredBy: string | null;
  deployedAt: string;
  durationSecs: number | null;
  environment: string;
}

const INTERNAL_BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

async function fetchHealthDetail(slug: string): Promise<HealthDetail | null> {
  try {
    const res = await fetch(`${INTERNAL_BASE}/api/health/projects/${slug}`, {
      next: { revalidate: 15 },
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return res.json() as Promise<HealthDetail>;
  } catch {
    return null;
  }
}

async function fetchDeployments(slug: string): Promise<DeploymentEvent[]> {
  try {
    const res = await fetch(
      `${INTERNAL_BASE}/api/projects/${slug}/deployments?limit=15`,
      { next: { revalidate: 30 } }
    );
    if (!res.ok) return [];
    return res.json() as Promise<DeploymentEvent[]>;
  } catch {
    return [];
  }
}

function normalizeComponents(raw: unknown): ComponentHealth[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (c): c is Record<string, unknown> =>
        typeof c === "object" && c !== null
    )
    .map((c) => ({
      name: typeof c.name === "string" ? c.name : String(c.name ?? ""),
      status: typeof c.status === "string" ? c.status : "unknown",
      latencyMs: typeof c.latencyMs === "number" ? c.latencyMs : null,
    }));
}

const TABS = [
  { key: "health", label: "Health" },
  { key: "deployments", label: "Deployments" },
  { key: "dora", label: "DORA" },
  { key: "tests", label: "Tests" },
  { key: "logs", label: "Logs" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default async function ProjectHealthPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const { tab = "health" } = await searchParams;
  const activeTab = (
    TABS.some((t) => t.key === tab) ? tab : "health"
  ) as TabKey;

  const [detail, deployments] = await Promise.all([
    fetchHealthDetail(slug),
    fetchDeployments(slug),
  ]);

  if (!detail) notFound();

  const components = normalizeComponents(detail.health.components);
  const uptimeDisplay =
    detail.uptime != null ? `${detail.uptime.toFixed(2)}%` : "—";

  return (
    <div className="flex flex-col gap-6">
      {/* Header — hero card */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-glass-border bg-glass-bg p-5 backdrop-blur-lg">
        <h1 className="text-xl font-semibold text-foreground">
          {detail.project.name}
        </h1>
        <StatusBadge status={detail.health.overallStatus} />
        <span className="text-sm text-muted-foreground/70">
          Uptime: {uptimeDisplay}
        </span>
      </div>

      {/* Tab bar */}
      <div className="border-b border-glass-border">
        <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Health tabs">
          {TABS.map((t) => {
            const isActive = activeTab === t.key;
            const href =
              t.key === "logs"
                ? `/watchtower/${slug}/logs`
                : t.key === "tests"
                  ? `/watchtower/${slug}/tests`
                  : `/watchtower/${slug}?tab=${t.key}`;

            return (
              <Link
                key={t.key}
                href={href}
                className={`relative whitespace-nowrap px-4 pb-3 pt-1 text-sm font-medium transition-colors ${
                  isActive
                    ? "text-[var(--color-brand-500)]"
                    : "text-muted-foreground hover:text-foreground/80"
                }`}
              >
                {t.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-brand-500)]" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === "health" && (
        <div className="flex flex-col gap-8">
          <LiveHealthDetail
            slug={slug}
            initialDetail={{
              overallStatus: detail.health.overallStatus,
              uptime: detail.uptime,
              components,
            }}
          />
          <DeploymentTimeline deployments={deployments.slice(0, 5)} />
        </div>
      )}

      {activeTab === "deployments" && (
        <DeploymentTimeline deployments={deployments} />
      )}

      {activeTab === "dora" && (
        <DoraDashboard
          metrics={{
            deployFrequency: { name: "Deploy Frequency", value: "—", level: "low", trend: "stable" },
            leadTime: { name: "Lead Time", value: "—", level: "low", trend: "stable" },
            changeFailureRate: { name: "Change Failure Rate", value: "—", level: "low", trend: "stable" },
            mttr: { name: "MTTR", value: "—", level: "low", trend: "stable" },
          }}
        />
      )}
    </div>
  );
}
