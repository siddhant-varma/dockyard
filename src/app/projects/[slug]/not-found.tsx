/**
 * 404 page for project routes — /projects/[slug]
 *
 * Shown when `notFound()` is called from a project page, e.g. when
 * the slug doesn't match any known project.
 */

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ProjectNotFound() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
      <svg
        width="80"
        height="80"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mb-6 text-foreground/15"
      >
        <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
      </svg>

      <h2 className="text-lg font-semibold text-foreground/80">
        Project not found
      </h2>
      <p className="mt-2 max-w-xs text-sm text-foreground/50">
        This project does not exist or has been removed.
      </p>
      <Link href="/projects" className="mt-6">
        <Button variant="outline" size="sm">
          Back to Projects
        </Button>
      </Link>
    </div>
  );
}
