/**
 * Incidents page — /watchtower/incidents
 *
 * Server component. Fetches incidents and renders a filterable list
 * with severity-colored left borders. Glass Observatory styling.
 */

import Link from "next/link";

interface Incident {
  id: string;
  title: string;
  severity: string;
  status: string;
  projectName: string;
  projectSlug: string;
  startedAt: string;
  resolvedAt: string | null;
  commanderName: string | null;
}

const INTERNAL_BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

async function fetchIncidents(): Promise<Incident[]> {
  try {
    const res = await fetch(`${INTERNAL_BASE}/api/incidents`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json() as Promise<Incident[]>;
  } catch {
    return [];
  }
}

const SEVERITY_BORDER: Record<string, string> = {
  sev1: "border-l-red-400",
  sev2: "border-l-orange-400",
  sev3: "border-l-yellow-400",
};

const STATUS_STYLES: Record<string, string> = {
  open: "bg-red-500/15 text-red-400",
  investigating: "bg-yellow-500/15 text-yellow-400",
  mitigated: "bg-blue-500/15 text-blue-400",
  resolved: "bg-green-500/15 text-green-400",
};

function formatDuration(start: string, end: string | null): string {
  const endTime = end ? new Date(end).getTime() : Date.now();
  const diffMs = endTime - new Date(start).getTime();
  const hours = Math.floor(diffMs / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export default async function IncidentsPage() {
  const incidents = await fetchIncidents();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Incidents</h1>
          <p className="mt-0.5 text-sm text-muted-foreground/70">
            Active and resolved incidents across all projects.
          </p>
        </div>
      </div>

      {incidents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-glass-border-strong bg-glass-bg py-16 text-center backdrop-blur-sm">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-glass-border bg-glass-bg">
            <svg
              className="h-5 w-5 text-green-400/60"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground">
            No incidents recorded.
          </p>
          <p className="mt-1 text-xs text-muted-foreground/50">
            Incidents are created automatically from alert escalations or
            manually.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {incidents.map((incident) => {
            const borderClass =
              SEVERITY_BORDER[incident.severity] ?? "border-l-glass-border";
            const statusClass =
              STATUS_STYLES[incident.status] ?? "bg-glass-hover text-muted-foreground";
            const isResolved = incident.status === "resolved";

            return (
              <Link
                key={incident.id}
                href={`/watchtower/incidents/${incident.id}`}
                className={`group flex items-center gap-4 rounded-xl border border-glass-border border-l-2 bg-glass-bg p-4 backdrop-blur-sm transition-all hover:bg-glass-hover ${borderClass} ${isResolved ? "opacity-60" : ""}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-foreground group-hover:text-[var(--color-brand-500)]">
                      {incident.title}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass}`}
                    >
                      {incident.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground/60">
                    <span>{incident.severity.toUpperCase()}</span>
                    <span>{incident.projectName}</span>
                    <span>
                      {formatDuration(incident.startedAt, incident.resolvedAt)}
                    </span>
                    {incident.commanderName && (
                      <span>Commander: {incident.commanderName}</span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground/40 shrink-0">
                  {new Date(incident.startedAt).toLocaleDateString("en-GB", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
