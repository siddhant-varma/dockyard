/**
 * Project settings page — /projects/[slug]/settings
 *
 * Server component. Renders DIP level config, connection strength,
 * and project-specific notification overrides. Glass Observatory styling.
 */

import { DipConfig } from "@/components/projects/dip-config";
import { HandoffBlock } from "@/components/projects/handoff-block";

type Params = Promise<{ slug: string }>;

export default async function ProjectSettingsPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Project Settings
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground/70">
          Integration protocol, connection, and notification settings.
        </p>
      </div>

      {/* DIP Configuration */}
      <div className="rounded-xl border border-glass-border bg-glass-bg p-5 backdrop-blur-sm">
        <h2 className="mb-4 text-sm font-semibold text-foreground">
          DockYard Integration Protocol (DIP)
        </h2>
        <DipConfig projectSlug={slug} currentLevel={0} />
      </div>

      {/* Context Handoff */}
      <div className="rounded-xl border border-glass-border bg-glass-bg p-5 backdrop-blur-sm">
        <h2 className="mb-2 text-sm font-semibold text-foreground">
          AI Context Handoff
        </h2>
        <p className="mb-4 text-xs text-muted-foreground/60">
          Generate a context block for AI agents working on this project.
        </p>
        <HandoffBlock projectSlug={slug} />
      </div>
    </div>
  );
}
