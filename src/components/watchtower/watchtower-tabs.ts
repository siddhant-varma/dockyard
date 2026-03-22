/**
 * Shared tab definitions for the watchtower health detail view.
 * Used by /watchtower/[slug] and all its sub-pages.
 */

import type { PageTab } from "@/components/layout/page-tabs";

export function buildHealthTabs(slug: string): PageTab[] {
  const base = `/watchtower/${slug}`;
  return [
    { label: "Health", href: base },
    { label: "Deployments", href: `${base}/deployments` },
    { label: "Logs", href: `${base}/logs` },
    { label: "Tests", href: `${base}/tests` },
    { label: "DORA", href: `${base}/dora` },
  ];
}
