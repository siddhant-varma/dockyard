/**
 * Project config page — /projects/[slug]/config
 *
 * Server component. Fetches the project's config entries (secrets masked)
 * from /api/projects/[slug]/config and renders the ConfigList component
 * alongside the ApplyRestart control.
 */

import { notFound } from "next/navigation";
import { ConfigList } from "@/components/config/config-list";
import { ApplyRestart } from "@/components/config/apply-restart";

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

async function fetchConfigEntries(slug: string): Promise<ConfigEntry[] | null> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/projects/${slug}/config`, {
    next: { revalidate: 0 },
  });
  if (res.status === 404) return null;
  if (!res.ok) return [];
  return res.json() as Promise<ConfigEntry[]>;
}

export default async function ConfigPage({ params }: { params: Params }) {
  const { slug } = await params;
  const entries = await fetchConfigEntries(slug);

  if (entries === null) notFound();

  return (
    <div className="flex flex-col gap-8">
      {/* Page header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          Config
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Environment variables and service parameters for{" "}
          <span className="font-medium text-neutral-700 dark:text-neutral-300">
            {slug}
          </span>
          . Secrets are masked by default.
        </p>
      </div>

      {/* Config entries */}
      <ConfigList entries={entries} slug={slug} />

      {/* Apply + redeploy */}
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-700 dark:bg-neutral-900">
        <h2 className="mb-3 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          Apply Configuration
        </h2>
        <ApplyRestart slug={slug} />
      </div>
    </div>
  );
}
