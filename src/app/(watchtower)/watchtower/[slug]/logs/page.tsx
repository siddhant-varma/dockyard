/**
 * Project logs page — /watchtower/[slug]/logs
 *
 * Server component shell. Renders the client-side LogsViewer which
 * handles fetching, polling, filtering, and auto-scroll internally.
 */

import Link from "next/link";
import { LogsViewer } from "@/components/watchtower/logs-viewer";

type Params = Promise<{ slug: string }>;

export default async function LogsPage({ params }: { params: Params }) {
  const { slug } = await params;

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
        <Link
          href={`/watchtower/${slug}`}
          className="hover:text-neutral-800 dark:hover:text-neutral-200"
        >
          {slug}
        </Link>
        <span>/</span>
        <span className="text-neutral-900 dark:text-neutral-100">Logs</span>
      </div>

      <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
        Logs
      </h1>

      <div className="flex-1 overflow-hidden">
        <LogsViewer slug={slug} />
      </div>
    </div>
  );
}
