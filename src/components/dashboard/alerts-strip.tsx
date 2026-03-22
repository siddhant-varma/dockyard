/**
 * AlertsStrip — live firing alerts displayed at the top of the Home dashboard.
 *
 * Each alert shows severity badge, message, project name, time ago,
 * and an action button (View Incident / Acknowledge).
 * Glass card container. Matches Stitch wireframe critical alert banner
 * and WIREFRAMES.md multi-alert strip.
 *
 * - SEV1 alerts render a "View Incident" link that navigates to the
 *   incident detail page at /watchtower/incidents/:id.
 * - SEV2/SEV3 alerts render an "Acknowledge" button that calls
 *   PUT /api/alerts/events/:id to update the alert status.
 */

import { Badge } from "@/components/ui/badge";
import { AlertStripActions } from "@/components/dashboard/alert-strip-actions";

interface AlertItem {
  id: string;
  severity: "sev1" | "sev2" | "sev3";
  message: string;
  projectName: string;
  timeAgo: string;
  /** Optional incident ID for SEV1 alerts that already have an incident created. */
  incidentId?: string;
}

interface AlertsStripProps {
  alerts: AlertItem[];
}

const SEV_STYLES: Record<string, string> = {
  sev1: "bg-red-500/15 text-red-400 border-red-500/30",
  sev2: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  sev3: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
};

export function AlertsStrip({ alerts }: AlertsStripProps) {
  if (alerts.length === 0) {
    return (
      <div className="glass rounded-xl px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-green-400" />
          <span className="text-sm text-muted-foreground">
            All systems nominal — no active alerts
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl divide-y divide-glass-divider">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="flex items-center justify-between gap-4 px-5 py-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            {alert.severity === "sev1" && (
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
            )}
            <Badge
              variant="outline"
              className={`shrink-0 ${SEV_STYLES[alert.severity]}`}
            >
              {alert.severity.toUpperCase()}
            </Badge>
            <span className="truncate text-sm text-foreground">
              {alert.message}
            </span>
            <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
              — {alert.projectName}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground/50">
              {alert.timeAgo}
            </span>
          </div>
          <AlertStripActions
            alertId={alert.id}
            severity={alert.severity}
            incidentId={alert.incidentId}
          />
        </div>
      ))}
    </div>
  );
}
