/**
 * IncidentTimeline — chronological feed of incident events.
 *
 * Displays timeline entries with actor, action, notes, and timestamps.
 */

interface TimelineEntry {
  actor: string;
  action: string;
  note?: string;
  timestamp: string;
}

interface IncidentTimelineProps {
  entries: TimelineEntry[];
}

const ACTION_COLORS: Record<string, string> = {
  "incident.created": "bg-red-500",
  "status.identified": "bg-orange-500",
  "status.monitoring": "bg-yellow-500",
  "status.resolved": "bg-green-500",
  "status.postmortem": "bg-purple-500",
  note: "bg-blue-500",
};

export function IncidentTimeline({ entries }: IncidentTimelineProps) {
  if (entries.length === 0) {
    return <p className="text-sm text-gray-500">No timeline entries.</p>;
  }

  return (
    <div className="space-y-4">
      {entries.map((entry, i) => {
        const color = ACTION_COLORS[entry.action] ?? "bg-gray-400";
        return (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`h-2.5 w-2.5 rounded-full ${color}`} />
              {i < entries.length - 1 && <div className="w-px flex-1 bg-gray-200" />}
            </div>
            <div className="flex-1 pb-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">{entry.actor}</span>
                <span className="text-gray-500">{entry.action}</span>
                <span className="text-xs text-gray-400">
                  {new Date(entry.timestamp).toLocaleString()}
                </span>
              </div>
              {entry.note && <p className="mt-1 text-sm text-gray-600">{entry.note}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
