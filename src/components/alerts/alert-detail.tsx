/**
 * AlertDetail — displays a single alert event with full context.
 *
 * Shows the rule name, threshold vs current value, runbook link,
 * severity badge, and a timeline of status changes. Used in the
 * alert events page when a user clicks on a specific alert.
 *
 * @param alert - Full alert event record with populated rule data.
 */

"use client";

/** Shape of an alert event with its associated rule. */
interface AlertEventWithRule {
  id: string;
  severity: string;
  status: string;
  message: string | null;
  context: Record<string, unknown> | null;
  triggeredAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  escalationLvl: number;
  rule: {
    name: string;
    metric: string;
    operator: string;
    threshold: number;
    runbookUrl: string | null;
  };
}

interface AlertDetailProps {
  alert: AlertEventWithRule;
}

const SEVERITY_COLORS: Record<string, string> = {
  sev1: "bg-red-100 text-red-800",
  sev2: "bg-orange-100 text-orange-800",
  sev3: "bg-yellow-100 text-yellow-800",
  sev4: "bg-blue-100 text-blue-800",
};

const STATUS_COLORS: Record<string, string> = {
  firing: "bg-red-500",
  acknowledged: "bg-yellow-500",
  resolved: "bg-green-500",
  auto_resolved: "bg-green-400",
};

export function AlertDetail({ alert }: AlertDetailProps) {
  const sevClass = SEVERITY_COLORS[alert.severity] ?? "bg-gray-100 text-gray-800";
  const currentValue = alert.context?.currentValue;

  const timeline = buildTimeline(alert);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold">{alert.rule.name}</h2>
          <p className="mt-1 text-sm text-gray-500">
            {alert.rule.metric} {alert.rule.operator} {alert.rule.threshold}
            {currentValue != null && (
              <span className="ml-2 font-medium">
                (current: {String(currentValue)})
              </span>
            )}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${sevClass}`}>
          {alert.severity.toUpperCase()}
        </span>
      </div>

      {/* Message */}
      {alert.message && (
        <div className="rounded-md bg-gray-50 p-4 text-sm">{alert.message}</div>
      )}

      {/* Runbook */}
      {alert.rule.runbookUrl && (
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-gray-700">Runbook:</span>
          <a
            href={alert.rule.runbookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline hover:text-blue-800"
          >
            {alert.rule.runbookUrl}
          </a>
        </div>
      )}

      {/* Escalation */}
      {alert.escalationLvl > 0 && (
        <div className="rounded-md bg-orange-50 p-3 text-sm text-orange-800">
          Escalated {alert.escalationLvl} time
          {alert.escalationLvl > 1 ? "s" : ""}
        </div>
      )}

      {/* Timeline */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-700">Timeline</h3>
        <div className="space-y-3">
          {timeline.map((entry, i) => (
            <div key={i} className="flex items-center gap-3">
              <div
                className={`h-2.5 w-2.5 rounded-full ${entry.color}`}
              />
              <span className="text-xs text-gray-500">{entry.time}</span>
              <span className="text-sm">{entry.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface TimelineEntry {
  label: string;
  time: string;
  color: string;
}

function buildTimeline(alert: AlertEventWithRule): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  const fmt = (ts: string) => new Date(ts).toLocaleString();

  entries.push({
    label: "Alert triggered",
    time: fmt(alert.triggeredAt),
    color: STATUS_COLORS.firing,
  });

  if (alert.acknowledgedAt) {
    entries.push({
      label: "Acknowledged",
      time: fmt(alert.acknowledgedAt),
      color: STATUS_COLORS.acknowledged,
    });
  }

  if (alert.resolvedAt) {
    entries.push({
      label: alert.status === "auto_resolved" ? "Auto-resolved" : "Resolved",
      time: fmt(alert.resolvedAt),
      color: STATUS_COLORS[alert.status] ?? STATUS_COLORS.resolved,
    });
  }

  return entries;
}
