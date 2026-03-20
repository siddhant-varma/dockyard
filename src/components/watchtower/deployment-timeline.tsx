/**
 * DeploymentTimeline — ordered list of deployment events for a project.
 *
 * Server component. Renders deployments most-recent first, each showing:
 * - Deploy status badge (success / failed / deploying / etc.)
 * - Truncated commit SHA (7 characters)
 * - Who triggered the deploy
 * - Timestamp (locale string)
 * - Duration in seconds, if available
 *
 * @param deployments - Array of deployment event records from the API.
 */

import { StatusBadge } from "@/components/shared";

interface DeploymentEvent {
  id: string;
  status: string;
  commitSha: string | null;
  commitMessage: string | null;
  triggeredBy: string | null;
  deployedAt: string;
  durationSecs: number | null;
  environment: string;
}

interface DeploymentTimelineProps {
  deployments: DeploymentEvent[];
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(secs: number | null): string {
  if (secs == null) return "—";
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export function DeploymentTimeline({ deployments }: DeploymentTimelineProps) {
  if (deployments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No deployments recorded yet.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-glass-border">
      <div className="border-b border-glass-border px-4 py-2.5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Deployment history
        </span>
      </div>
      <ul className="divide-y divide-glass-divider">
        {deployments.map((deploy) => (
          <li key={deploy.id} className="flex flex-col gap-1.5 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={deploy.status} />
              {deploy.commitSha && (
                <code className="rounded bg-glass-hover px-1.5 py-0.5 text-xs font-mono text-foreground/80">
                  {deploy.commitSha.slice(0, 7)}
                </code>
              )}
              <span className="text-xs text-muted-foreground/60">
                {deploy.environment}
              </span>
            </div>

            {deploy.commitMessage && (
              <p className="truncate text-xs text-muted-foreground">
                {deploy.commitMessage}
              </p>
            )}

            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {deploy.triggeredBy && (
                <span>
                  Triggered by{" "}
                  <span className="font-medium text-foreground/80">
                    {deploy.triggeredBy}
                  </span>
                </span>
              )}
              <span>{formatTimestamp(deploy.deployedAt)}</span>
              <span>{formatDuration(deploy.durationSecs)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
