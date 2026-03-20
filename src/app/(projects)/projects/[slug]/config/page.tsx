/**
 * Project config page — /projects/[slug]/config
 *
 * Server component. Fetches config entries and renders the ConfigList with
 * TemplateSelector and AutoRollbackToggle wired into the header.
 * Glass Observatory styling.
 */

import { notFound } from "next/navigation";
import { ConfigList } from "@/components/config/config-list";
import { ApplyRestart } from "@/components/config/apply-restart";
import { TemplateSelector } from "@/components/config/template-selector";
import { AutoRollbackToggle } from "@/components/config/auto-rollback-toggle";

type Params = Promise<{ slug: string }>;

interface ConfigEntry {
  id: string;
  key: string;
  value: string;
  isSecret: boolean;
  category: string | null;
  displayName: string | null;
  description: string | null;
  inputType: string;
}

const INTERNAL_BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

async function fetchConfigEntries(
  slug: string
): Promise<ConfigEntry[] | null> {
  try {
    const res = await fetch(`${INTERNAL_BASE}/api/projects/${slug}/config`, {
      next: { revalidate: 0 },
    });
    if (res.status === 404) return null;
    if (!res.ok) return [];
    return res.json() as Promise<ConfigEntry[]>;
  } catch {
    return [];
  }
}

export default async function ConfigPage({ params }: { params: Params }) {
  const { slug } = await params;
  const entries = await fetchConfigEntries(slug);

  if (entries === null) notFound();

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Configuration</h1>
        <p className="mt-0.5 text-sm text-muted-foreground/70">
          Environment variables and service parameters for{" "}
          <span className="font-medium text-foreground/80">{slug}</span>.
          Secrets are masked by default.
        </p>
      </div>

      {/* Template + Rollback controls */}
      <div className="flex flex-col gap-3 rounded-xl border border-glass-border bg-glass-bg p-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
        <TemplateSelector projectSlug={slug} onApplied={() => {}} />
        <AutoRollbackToggle projectSlug={slug} />
      </div>

      {/* Config entries */}
      <ConfigList entries={entries} slug={slug} />

      {/* Apply + redeploy */}
      <div className="rounded-xl border border-glass-border bg-glass-bg p-5 backdrop-blur-sm">
        <h2 className="mb-3 text-sm font-semibold text-foreground/90">
          Apply Configuration
        </h2>
        <ApplyRestart slug={slug} />
      </div>
    </div>
  );
}
