/**
 * Incident Detail page — /watchtower/incidents/[id]
 *
 * Server component. Status banner, timeline, detail card.
 * Matches Stitch "Incident Detail" wireframe + WIREFRAMES.md §12.
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isDemoMode } from "@/lib/env";
import {
  DEMO_INCIDENTS,
  DEMO_INCIDENT_TIMELINE,
  type DemoIncident,
  type DemoTimelineEntry,
} from "@/lib/demo-data";

type Params = Promise<{ id: string }>;

const INTERNAL_BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

async function fetchIncident(
  id: string
): Promise<{ incident: DemoIncident; timeline: DemoTimelineEntry[] } | null> {
  if (isDemoMode) {
    const incident = DEMO_INCIDENTS.find((i) => i.id === id);
    if (!incident) return null;
    return { incident, timeline: DEMO_INCIDENT_TIMELINE };
  }
  try {
    const res = await fetch(`${INTERNAL_BASE}/api/incidents/${id}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json() as Promise<{
      incident: DemoIncident;
      timeline: DemoTimelineEntry[];
    }>;
  } catch {
    return null;
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

const TIMELINE_ICON: Record<string, { symbol: string; color: string }> = {
  warning: { symbol: "!", color: "text-red-400 bg-red-500/15" },
  search: { symbol: "?", color: "text-blue-400 bg-blue-500/15" },
  comment: { symbol: "…", color: "text-foreground/50 bg-white/5" },
  deploy: { symbol: "↑", color: "text-green-400 bg-green-500/15" },
  check: { symbol: "✓", color: "text-green-400 bg-green-500/15" },
};

export default async function IncidentDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const data = await fetchIncident(id);

  if (!data) notFound();

  const { incident, timeline } = data;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="text-xs text-foreground/40">
        <Link
          href="/watchtower/incidents"
          className="transition-colors hover:text-foreground/60"
        >
          Incidents
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-foreground/60">{incident.id}</span>
      </div>

      {/* Status banner */}
      <div className="glass rounded-xl p-5">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Badge
            variant="outline"
            className={`text-[10px] uppercase ${SEV_BADGE[incident.severity]}`}
          >
            {incident.severity}
          </Badge>
          <Badge
            variant="outline"
            className={`text-[10px] capitalize ${STATUS_BADGE[incident.status]}`}
          >
            {incident.status}
          </Badge>
          <span className="text-xs text-foreground/40">
            {incident.duration} elapsed
          </span>
        </div>
        <h1 className="text-lg font-semibold text-foreground">
          {incident.title}
        </h1>
        <p className="mt-1 text-sm text-foreground/50">
          Affecting {incident.service} — Started {incident.startedAt}
        </p>
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[1fr_300px]">
        {/* Timeline */}
        <Card className="bg-card border-glass-border backdrop-blur-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {timeline.length === 0 ? (
              <p className="text-sm text-foreground/40">No events yet.</p>
            ) : (
              <div className="relative space-y-4 pl-8">
                {/* Vertical line */}
                <div className="absolute left-3 top-1 bottom-1 w-px bg-glass-border" />

                {timeline.map((entry, i) => {
                  const icon = TIMELINE_ICON[entry.icon] ?? TIMELINE_ICON.comment;
                  return (
                    <div key={i} className="relative">
                      {/* Dot */}
                      <span
                        className={`absolute -left-8 top-0.5 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${icon.color}`}
                      >
                        {icon.symbol}
                      </span>
                      <p className="text-xs text-foreground/40 mb-0.5">
                        {entry.time}
                      </p>
                      <p className="text-sm text-foreground/70">{entry.text}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail sidebar */}
        <div className="space-y-4">
          <Card className="bg-card border-glass-border backdrop-blur-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-foreground/50">Commander</span>
                <span className="text-foreground/80">{incident.commander}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/50">Service</span>
                <span className="text-foreground/80">{incident.service}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/50">Severity</span>
                <span className="uppercase text-foreground/80">
                  {incident.severity}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/50">Duration</span>
                <span className="font-mono text-foreground/80">
                  {incident.duration}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
