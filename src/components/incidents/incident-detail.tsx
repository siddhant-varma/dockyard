/**
 * IncidentDetail — displays a single incident with status controls.
 *
 * Shows title, severity, status transitions, related alerts/deploys,
 * and the timeline component. Includes "Add Note" form.
 */

"use client";

import { useState } from "react";

interface Incident {
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

interface IncidentDetailProps {
  incident: Incident;
  onStatusChange?: (newStatus: string) => void;
  onAddNote?: (note: string) => void;
}

const STATUS_FLOW = ["investigating", "identified", "monitoring", "resolved", "postmortem"];
const SEV_COLORS: Record<string, string> = {
  sev1: "bg-red-100 text-red-800",
  sev2: "bg-orange-100 text-orange-800",
  sev3: "bg-yellow-100 text-yellow-800",
  sev4: "bg-blue-100 text-blue-800",
};
const STATUS_COLORS: Record<string, string> = {
  investigating: "bg-red-500 text-white",
  identified: "bg-orange-500 text-white",
  monitoring: "bg-yellow-500 text-white",
  resolved: "bg-green-500 text-white",
  postmortem: "bg-purple-500 text-white",
};

export function IncidentDetail({ incident, onStatusChange, onAddNote }: IncidentDetailProps) {
  const [note, setNote] = useState("");
  const currentIdx = STATUS_FLOW.indexOf(incident.status);
  const nextStatus = currentIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIdx + 1] : null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold">{incident.title}</h2>
          <div className="mt-1 flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEV_COLORS[incident.severity] ?? ""}`}>
              {incident.severity.toUpperCase()}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[incident.status] ?? ""}`}>
              {incident.status}
            </span>
          </div>
        </div>
        {nextStatus && onStatusChange && (
          <button
            onClick={() => onStatusChange(nextStatus)}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Move to {nextStatus}
          </button>
        )}
      </div>

      {incident.mttrSeconds != null && (
        <div className="text-sm text-gray-600">
          MTTR: {formatDuration(incident.mttrSeconds)}
        </div>
      )}

      <div className="flex gap-4 text-sm text-gray-500">
        <span>Created: {new Date(incident.createdAt).toLocaleString()}</span>
        {incident.resolvedAt && <span>Resolved: {new Date(incident.resolvedAt).toLocaleString()}</span>}
      </div>

      {(incident.relatedAlerts?.length ?? 0) > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase text-gray-500">Related Alerts</h4>
          <div className="mt-1 flex flex-wrap gap-1">
            {incident.relatedAlerts?.map((id) => (
              <span key={id} className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono">{id.slice(0, 8)}</span>
            ))}
          </div>
        </div>
      )}

      {onAddNote && (
        <form
          onSubmit={(e) => { e.preventDefault(); if (note.trim()) { onAddNote(note.trim()); setNote(""); } }}
          className="flex gap-2"
        >
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add investigation note..."
            className="flex-1 rounded border px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded bg-gray-800 px-4 py-2 text-sm text-white">Add Note</button>
        </form>
      )}
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
}
