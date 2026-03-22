/**
 * Shared tab definitions for the project detail view.
 * Used by /projects/[slug] and all its sub-pages.
 */

import type { PageTab } from "@/components/layout/page-tabs";

export function buildProjectTabs(slug: string): PageTab[] {
  const base = `/projects/${slug}`;
  return [
    { label: "Overview", href: base },
    { label: "Roadmap", href: `${base}/roadmap` },
    { label: "Config", href: `${base}/config` },
    { label: "Members", href: `${base}/members` },
    { label: "SLO", href: `${base}/slo` },
    { label: "Insights", href: `${base}/insights` },
    { label: "Settings", href: `${base}/settings` },
  ];
}
