/**
 * Projects settings tab — lists all discovered projects.
 *
 * Fetches the project list from GET /api/projects and displays
 * name, discovery source, and status in a table.
 */

"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ProjectsTab() {
  const [projects, setProjects] = useState<Array<{
    name: string;
    slug: string;
    discoveredVia?: string;
    status?: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.ok ? r.json() : { data: [] })
      .then((res) => setProjects(res.data ?? []))
      .catch(() => setFetchError("Failed to load projects"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card className="bg-card border-glass-border backdrop-blur-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Active Projects</CardTitle>
      </CardHeader>
      <CardContent>
        {fetchError && (
          <div className="mb-3 rounded-md border border-red-500/30 bg-red-500/5 p-3">
            <p className="text-xs text-red-400">{fetchError}</p>
          </div>
        )}
        {loading ? (
          <p className="text-xs text-foreground/40">Loading...</p>
        ) : projects.length === 0 ? (
          <p className="text-xs text-foreground/40">No projects discovered yet. Run a scan from the Sources tab.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-glass-border text-left text-xs text-foreground/40">
                  <th className="pb-2 pr-4 font-medium">Project</th>
                  <th className="pb-2 pr-4 font-medium">Source</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass-border">
                {projects.map((p) => (
                  <tr key={p.slug} className="text-foreground/70">
                    <td className="py-2.5 pr-4 font-medium text-foreground/80">{p.name}</td>
                    <td className="py-2.5 pr-4 text-xs">{p.discoveredVia ?? "\u2014"}</td>
                    <td className="py-2.5 text-xs capitalize">{p.status ?? "\u2014"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
