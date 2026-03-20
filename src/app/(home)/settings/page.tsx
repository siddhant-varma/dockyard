import { db } from "@/db/connection";
import { platformSettings, discoverySources } from "@/db/schema";
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

  let settings = await db.query.platformSettings.findFirst({
    where: eq(platformSettings.id, "singleton"),
  });

  // Auto-initialize platform settings on first visit
  if (!settings) {
    [settings] = await db
      .insert(platformSettings)
      .values({
        id: "singleton",
        operatingMode: "local",
        autoScan: true,
        scanInterval: 300,
      })
      .onConflictDoNothing()
      .returning();

    // Refetch if onConflict race condition
    if (!settings) {
      settings = await db.query.platformSettings.findFirst({
        where: eq(platformSettings.id, "singleton"),
      });
    }
  }

  const allProjects = await db.query.projects.findMany({
    orderBy: (p, { asc }) => [asc(p.name)],
  });

  let allSources = await db.query.discoverySources.findMany({
    orderBy: (s, { asc }) => [asc(s.createdAt)],
  });

  // Auto-create default filesystem discovery source on first visit
  if (allSources.length === 0) {
    await db
      .insert(discoverySources)
      .values({
        type: "filesystem",
        name: "Local Projects",
        config: { path: "..", recursive: false },
        enabled: true,
      })
      .onConflictDoNothing();

    allSources = await db.query.discoverySources.findMany({
      orderBy: (s, { asc }) => [asc(s.createdAt)],
    });
  }

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

      {tab === "general" && (
        <GeneralTab
          initial={{
            operatingMode: settings?.operatingMode ?? "local",
            autoScan: settings?.autoScan ?? true,
            scanInterval: settings?.scanInterval ?? 300,
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
