import { db } from "@/db/connection";
import { platformSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { GeneralTab } from "@/components/settings/general-tab";
import { ProjectsTab } from "@/components/settings/projects-tab";
import { SourcesTab } from "@/components/settings/sources-tab";

interface Props {
  searchParams: Promise<{ tab?: string }>;
}

const TABS = [
  { id: "general", label: "General" },
  { id: "projects", label: "Projects" },
  { id: "sources", label: "Sources" },
];

export default async function SettingsPage({ searchParams }: Props) {
  const { tab = "general" } = await searchParams;

  const settings = await db.query.platformSettings.findFirst({
    where: eq(platformSettings.id, "singleton"),
  });

  const allProjects = await db.query.projects.findMany({
    orderBy: (p, { asc }) => [asc(p.name)],
  });

  const allSources = await db.query.discoverySources.findMany({
    orderBy: (s, { asc }) => [asc(s.createdAt)],
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
        Settings
      </h1>

      <div className="mb-6 flex gap-1 border-b border-neutral-200 dark:border-neutral-800">
        {TABS.map((t) => (
          <a
            key={t.id}
            href={`/settings?tab=${t.id}`}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            }`}
          >
            {t.label}
          </a>
        ))}
      </div>

      {tab === "general" && settings && (
        <GeneralTab
          initial={{
            operatingMode: settings.operatingMode,
            autoScan: settings.autoScan,
            scanInterval: settings.scanInterval,
          }}
        />
      )}

      {tab === "projects" && (
        <ProjectsTab
          initial={allProjects.map((p) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            status: p.status,
            discoveredVia: p.discoveredVia,
            techStack: p.techStack,
          }))}
        />
      )}

      {tab === "sources" && (
        <SourcesTab
          initial={allSources.map((s) => ({
            id: s.id,
            type: s.type,
            name: s.name,
            enabled: s.enabled,
            lastScanAt: s.lastScanAt?.toISOString() ?? null,
            lastScanResult: s.lastScanResult as {
              found?: number;
            } | null,
          }))}
        />
      )}
    </div>
  );
}
