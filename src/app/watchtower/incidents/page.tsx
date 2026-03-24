/**
 * Watchtower Incidents list — /watchtower/incidents
 *
 * Server component. Incident cards with severity, status, commander.
 * Matches Stitch "DockYard Watchtower Incidents" wireframe + WIREFRAMES.md §12.
 */

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageTabs } from "@/components/layout/page-tabs";
import { CreateIncidentForm } from "@/components/watchtower/create-incident-form";
import { EmptyState } from "@/components/shared/empty-state";
import { isDemoMode, isDiagnosticMode } from "@/lib/env";
import { DEMO_INCIDENTS, DEMO_PROJECTS, type DemoIncident } from "@/lib/demo-data";

const WT_TABS = [
  { label: "Overview", href: "/watchtower" },
  { label: "Alerts", href: "/watchtower/alerts" },
  { label: "Incidents", href: "/watchtower/incidents" },
];

const INTERNAL_BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

interface ProjectOption {
  id: string;
  name: string;
}

async function fetchIncidents(): Promise<DemoIncident[]> {
  if (isDemoMode && !isDiagnosticMode) return DEMO_INCIDENTS;
  try {
    const res = await fetch(`${INTERNAL_BASE}/api/incidents`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json() as Promise<DemoIncident[]>;
  } catch {
    return [];
  }
}

async function fetchProjects(): Promise<ProjectOption[]> {
  if (isDemoMode && !isDiagnosticMode) {
    return DEMO_PROJECTS.map((p) => ({ id: p.id, name: p.name }));
  }
  try {
    const res = await fetch(`${INTERNAL_BASE}/api/projects`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{ id: string; name: string }>;
    return data.map((p) => ({ id: p.id, name: p.name }));
  } catch {
    return [];
  }
}

const SEV_BADGE: Record<string, string> = {
  sev1: "bg-red-500/20 text-red-300 border-red-500/40",
  sev2: "bg-orange-500/20 text-orange-300 border-orange-500/40",
  sev3: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
};

const STATUS_BADGE: Record<string, string> = {
  open: "bg-red-500/15 text-red-300 border-red-500/30",
  investigating: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  mitigated: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  resolved: "bg-green-500/15 text-green-300 border-green-500/30",
};

export default async function IncidentsPage() {
  const [incidents, projects] = await Promise.all([
    fetchIncidents(),
    fetchProjects(),
  ]);

  const openCount = incidents.filter(
    (i) => i.status !== "resolved"
  ).length;

  return (
    <div className="space-y-6">
      <PageTabs tabs={WT_TABS} />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Incidents</h1>
          <p className="mt-1 text-sm text-foreground/40">
            {openCount > 0
              ? `${openCount} active incident${openCount !== 1 ? "s" : ""}`
              : "No active incidents"}
          </p>
        </div>
        <CreateIncidentForm projects={projects} />
      </div>

      {/* Incident list */}
      {incidents.length === 0 ? (
        <EmptyState
          icon="alert"
          title="No incidents recorded"
          description="Incidents will be created automatically from alert escalations or manually."
        />
      ) : (
        <div className="space-y-3">
          {incidents.map((inc) => (
            <Link
              key={inc.id}
              href={`/watchtower/incidents/${inc.id}`}
              className="group block transition-transform duration-100 active:scale-[0.98]"
            >
              <Card className="bg-card border-glass-border backdrop-blur-lg transition-all duration-200 group-hover:border-glass-border-strong">
                <CardContent className="py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      {/* Badges row */}
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`text-[10px] uppercase ${SEV_BADGE[inc.severity]}`}
                        >
                          {inc.severity}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-[10px] capitalize ${STATUS_BADGE[inc.status]}`}
                        >
                          {inc.status}
                        </Badge>
                      </div>

                      {/* Title */}
                      <p className="text-sm font-medium text-foreground/80 transition-colors group-hover:text-foreground">
                        {inc.title}
                      </p>

                      {/* Meta */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-foreground/40">
                        <span>{inc.service}</span>
                        <span>Started {inc.startedAt}</span>
                        <span>Duration: {inc.duration}</span>
                        {inc.commander !== "—" && (
                          <span>Commander: {inc.commander}</span>
                        )}
                      </div>
                    </div>

                    {/* Chevron */}
                    <span className="text-foreground/20 transition-colors group-hover:text-foreground/50">
                      →
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
