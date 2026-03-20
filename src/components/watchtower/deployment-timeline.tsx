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
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        No deployments recorded yet.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-700">
      <div className="border-b border-neutral-200 px-4 py-2.5 dark:border-neutral-700">
        <span className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Deployment history
        </span>
      </div>
      <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
        {deployments.map((deploy) => (
          <li key={deploy.id} className="flex flex-col gap-1.5 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={deploy.status} />
              {deploy.commitSha && (
                <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs font-mono text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                  {deploy.commitSha.slice(0, 7)}
                </code>
              )}
              <span className="text-xs text-neutral-400 dark:text-neutral-500">
                {deploy.environment}
              </span>
            </div>

            {deploy.commitMessage && (
              <p className="truncate text-xs text-neutral-600 dark:text-neutral-400">
                {deploy.commitMessage}
              </p>
            )}

            <div className="flex flex-wrap gap-3 text-xs text-neutral-500 dark:text-neutral-400">
              {deploy.triggeredBy && (
                <span>
                  Triggered by{" "}
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">
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
