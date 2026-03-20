"use client";

import { useState } from "react";

interface Project {
  id: string;
  name: string;
  slug: string;
  status: string;
  discoveredVia: string | null;
  techStack: string[] | null;
}

export function ProjectsTab({ initial }: { initial: Project[] }) {
  const [projects, setProjects] = useState(initial);
  const [scanning, setScanning] = useState(false);

  async function handleScan() {
    setScanning(true);
    try {
      await fetch("/api/discovery");
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (Array.isArray(data)) {
        setProjects(data);
      }
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground/80">
          Discovered Projects ({projects.length})
        </h3>
        <button
          onClick={handleScan}
          disabled={scanning}
          className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {scanning ? "Scanning..." : "Scan Now"}
        </button>
      </div>

      <div className="divide-y divide-white/[0.06] rounded-md border border-white/[0.06]">
        {projects.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No projects discovered yet. Add a discovery source and scan.
          </div>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className="flex items-center justify-between p-3"
            >
              <div>
                <div className="text-sm font-medium text-foreground">
                  {project.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {project.slug} &middot; via{" "}
                  {project.discoveredVia ?? "unknown"}
                  {project.techStack && project.techStack.length > 0 && (
                    <> &middot; {project.techStack.join(", ")}</>
                  )}
                </div>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  project.status === "active"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                    : project.status === "discovered"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      : "bg-white/[0.06] text-muted-foreground"
                }`}
              >
                {project.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
