/**
 * QuickActions — project selector + action buttons for the Home dashboard.
 *
 * Matches WIREFRAMES.md: [project-alpha ▾] [Redeploy] [Quick Env Update]
 */

import { Button } from "@/components/ui/button";

interface QuickActionsProps {
  projects: { slug: string; name: string }[];
}

export function QuickActions({ projects }: QuickActionsProps) {
  return (
    <div className="glass rounded-xl px-5 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <select className="rounded-lg border border-glass-border bg-glass-input px-3 py-1.5 text-sm text-foreground backdrop-blur-sm focus:border-[var(--color-brand-500)] focus:outline-none">
          {projects.length === 0 ? (
            <option>No projects</option>
          ) : (
            projects.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))
          )}
        </select>
        <Button variant="outline" size="sm" className="gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Redeploy
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Quick Env Update
        </Button>
      </div>
    </div>
  );
}
