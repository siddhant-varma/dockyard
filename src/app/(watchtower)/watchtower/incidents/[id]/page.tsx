/**
 * Incident detail page — /watchtower/incidents/[id]
 *
 * Server component. Fetches incident detail and renders Timeline + Detail
 * sections. Wires IncidentTimeline and IncidentDetail components.
 * Glass Observatory styling.
 */

import { notFound } from "next/navigation";
import { IncidentTimeline } from "@/components/incidents/incident-timeline";
import { IncidentDetail } from "@/components/incidents/incident-detail";

type Params = Promise<{ id: string }>;

interface IncidentData {
  id: string;
  title: string;
  severity: string;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
  mttrSeconds: number | null;
  relatedAlerts: string[] | null;
  relatedDeploys: string[] | null;
  postmortem: string | null;
}

interface TimelineEntry {
  actor: string;
  action: string;
  note?: string;
  timestamp: string;
}

const INTERNAL_BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

async function fetchIncident(id: string): Promise<IncidentData | null> {
  try {
    const res = await fetch(`${INTERNAL_BASE}/api/incidents/${id}`, {
      cache: "no-store",
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return res.json() as Promise<IncidentData>;
  } catch {
    return null;
  }
}

async function fetchTimeline(id: string): Promise<TimelineEntry[]> {
  try {
    const res = await fetch(`${INTERNAL_BASE}/api/incidents/${id}/timeline`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json() as Promise<TimelineEntry[]>;
  } catch {
    return [];
  }
}

const SEVERITY_STYLES: Record<string, string> = {
  sev1: "bg-red-500/15 text-red-400 border-red-500/20",
  sev2: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  sev3: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
};

const STATUS_STYLES: Record<string, string> = {
  investigating: "bg-yellow-500/15 text-yellow-400",
  identified: "bg-orange-500/15 text-orange-400",
  monitoring: "bg-blue-500/15 text-blue-400",
  resolved: "bg-green-500/15 text-green-400",
  postmortem: "bg-purple-500/15 text-purple-400",
};

export default async function IncidentDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const [incident, timeline] = await Promise.all([
    fetchIncident(id),
    fetchTimeline(id),
  ]);

  if (!incident) notFound();

  const severityClass =
    SEVERITY_STYLES[incident.severity] ??
    "bg-glass-hover text-muted-foreground";
  const statusClass =
    STATUS_STYLES[incident.status] ??
    "bg-glass-hover text-muted-foreground";

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="rounded-xl border border-glass-border bg-glass-bg p-5 backdrop-blur-lg">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <h1 className="text-xl font-semibold text-foreground">
            {incident.title}
          </h1>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${severityClass}`}
          >
            {incident.severity.toUpperCase()}
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass}`}
          >
            {incident.status}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground/60">
          <span>
            Started:{" "}
            {new Date(incident.createdAt).toLocaleString("en-GB", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {incident.resolvedAt && (
            <span>
              Resolved:{" "}
              {new Date(incident.resolvedAt).toLocaleString("en-GB", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
      </div>

      {/* Content: Timeline + Detail sidebar */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-foreground/80">
            Timeline
          </h2>
          <div className="rounded-xl border border-glass-border bg-glass-bg p-5 backdrop-blur-sm">
            <IncidentTimeline entries={timeline} />
          </div>
        </div>
        <div>
          <h2 className="mb-4 text-sm font-semibold text-foreground/80">
            Incident Details
          </h2>
          <div className="rounded-xl border border-glass-border bg-glass-bg p-5 backdrop-blur-sm">
            <IncidentDetail incident={incident} />
          </div>
        </div>
      </div>
    </div>
  );
}
