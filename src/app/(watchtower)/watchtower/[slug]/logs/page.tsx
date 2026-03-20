/**
 * Project logs page — /watchtower/[slug]/logs
 *
 * Server component shell. Renders the client-side LogsViewer which
 * handles fetching, polling, filtering, and auto-scroll internally.
 * Glass Observatory styling with full-height terminal layout.
 */

import Link from "next/link";
import { LogsViewer } from "@/components/watchtower/logs-viewer";

type Params = Promise<{ slug: string }>;

export default async function LogsPage({ params }: { params: Params }) {
  const { slug } = await params;

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground/60">
        <Link
          href={`/watchtower/${slug}`}
          className="hover:text-foreground/80 transition-colors"
        >
          {slug}
        </Link>
        <span className="text-muted-foreground/30">/</span>
        <span className="text-foreground/80">Logs</span>
      </div>

      <h1 className="text-xl font-semibold text-foreground">Logs</h1>

      {/* Full-height terminal-style log viewer */}
      <div className="flex-1 overflow-hidden rounded-xl border border-glass-border bg-[#080e1b] backdrop-blur-lg">
        <LogsViewer slug={slug} />
      </div>
    </div>
  );
}
