/**
 * Project health detail page — /watchtower/[slug]
 *
 * Server component. Fetches health detail for a single project and
 * renders tabbed sections: Health (default), Logs, and Deployments.
 *
 * Health tab: HealthMetrics component + DeploymentTimeline component.
 * Logs tab: link to the dedicated /watchtower/[slug]/logs route.
 * Deployments tab: full DeploymentTimeline.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import { LiveHealthDetail } from "@/components/watchtower/live-health-detail";
import { DeploymentTimeline } from "@/components/watchtower/deployment-timeline";
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

async function fetchHealthDetail(slug: string): Promise<HealthDetail | null> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/health/projects/${slug}`, {
    next: { revalidate: 15 },
  });
  if (res.status === 404) return null;
  if (!res.ok) return null;
  return res.json() as Promise<HealthDetail>;
}

async function fetchDeployments(slug: string): Promise<DeploymentEvent[]> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const res = await fetch(
    `${baseUrl}/api/projects/${slug}/deployments?limit=15`,
    { next: { revalidate: 30 } }
  );
  if (!res.ok) return [];
  return res.json() as Promise<DeploymentEvent[]>;
}

function normalizeComponents(raw: unknown): ComponentHealth[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (c): c is Record<string, unknown> => typeof c === "object" && c !== null
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

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          {detail.project.name}
        </h1>
        <StatusBadge status={detail.health.overallStatus} />
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-700">
        {TABS.map((t) => {
          const isActive = activeTab === t.key;
          if (t.key === "logs") {
            return (
              <Link
                key={t.key}
                href={`/watchtower/${slug}/logs`}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-b-2 border-neutral-900 text-neutral-900 dark:border-neutral-100 dark:text-neutral-100"
                    : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                }`}
              >
                {t.label}
              </Link>
            );
          }
          return (
            <Link
              key={t.key}
              href={`/watchtower/${slug}?tab=${t.key}`}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "border-b-2 border-neutral-900 text-neutral-900 dark:border-neutral-100 dark:text-neutral-100"
                  : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
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
    </div>
  );
}
