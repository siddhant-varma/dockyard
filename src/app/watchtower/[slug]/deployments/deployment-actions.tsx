/**
 * DeploymentActions — Client component for Diff and Rollback buttons.
 *
 * Renders inline diff view on click and handles rollback with confirmation.
 * Used within the Deployments page to keep the parent as a server component.
 */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useReAuth } from "@/components/auth/reauth-modal";

/** Shape returned by the deployment diff API endpoint. */
interface DeployDiff {
  deployEventId: string;
  previousDeployEventId: string | null;
  commitRange: string | null;
  commitMessages: string[];
  filesChangedCount: number;
  configChanges: Array<{
    configEntryId: string;
    oldValueHash: string | null;
    newValueHash: string | null;
    changedAt: string;
    changeReason: string | null;
  }>;
}

interface DeploymentActionsProps {
  /** Project slug for API calls. */
  slug: string;
  /** Deployment event ID. */
  deploymentId: string;
  /** Whether to show the rollback button. */
  showRollback: boolean;
}

/**
 * Interactive buttons for a single deployment row.
 *
 * - **Diff**: Fetches and displays the deployment diff inline below the button row.
 * - **Rollback**: Shows a confirmation prompt, then triggers a rollback via POST.
 */
export function DeploymentActions({
  slug,
  deploymentId,
  showRollback,
}: DeploymentActionsProps) {
  const [diff, setDiff] = useState<DeployDiff | null>(null);
  const [diffOpen, setDiffOpen] = useState(false);
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffError, setDiffError] = useState<string | null>(null);

  const [rollbackLoading, setRollbackLoading] = useState(false);
  const [rollbackResult, setRollbackResult] = useState<string | null>(null);
  const { requireReAuth, ReAuthGate } = useReAuth();

  async function handleDiffClick() {
    if (diffOpen) {
      setDiffOpen(false);
      return;
    }

    setDiffLoading(true);
    setDiffError(null);

    try {
      const res = await fetch(
        `/api/projects/${slug}/deployments/${deploymentId}/diff`
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Failed to fetch diff (${res.status})`);
      }
      const data: DeployDiff = await res.json();
      setDiff(data);
      setDiffOpen(true);
    } catch (err) {
      setDiffError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setDiffLoading(false);
    }
  }

  async function handleRollbackClick() {
    const confirmed = await requireReAuth(
      "Roll back to this deployment? This will trigger a new deployment reverting to this version."
    );
    if (!confirmed) return;

    setRollbackLoading(true);
    setRollbackResult(null);

    try {
      const res = await fetch(
        `/api/projects/${slug}/deployments/${deploymentId}/rollback`,
        { method: "POST" }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.error ?? `Rollback failed (${res.status})`
        );
      }
      setRollbackResult("Rollback triggered successfully.");
    } catch (err) {
      setRollbackResult(
        err instanceof Error ? err.message : "Rollback failed"
      );
    } finally {
      setRollbackLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={handleDiffClick}
          disabled={diffLoading}
        >
          {diffLoading ? "Loading..." : diffOpen ? "Hide Diff" : "Diff"}
        </Button>
        {showRollback && (
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={handleRollbackClick}
            disabled={rollbackLoading}
          >
            {rollbackLoading ? "Rolling back..." : "Rollback"}
          </Button>
        )}
      </div>

      <ReAuthGate />

      {/* Rollback result message */}
      {rollbackResult && (
        <p className="text-xs text-foreground/60">{rollbackResult}</p>
      )}

      {/* Diff error */}
      {diffError && (
        <p className="text-xs text-red-400">{diffError}</p>
      )}

      {/* Inline diff view */}
      {diffOpen && diff && (
        <div className="rounded-lg border border-glass-border bg-card/50 p-3 space-y-2 text-xs">
          {diff.commitRange && (
            <div>
              <span className="text-foreground/50">Commit range: </span>
              <span className="font-mono text-foreground/70">
                {diff.commitRange}
              </span>
            </div>
          )}

          <div>
            <span className="text-foreground/50">Files changed: </span>
            <span className="text-foreground/70">{diff.filesChangedCount}</span>
          </div>

          {diff.commitMessages.length > 0 && (
            <div>
              <span className="text-foreground/50">Commits:</span>
              <ul className="mt-1 list-disc pl-4 text-foreground/60">
                {diff.commitMessages.map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
              </ul>
            </div>
          )}

          {diff.configChanges.length > 0 && (
            <div>
              <span className="text-foreground/50">
                Config changes ({diff.configChanges.length}):
              </span>
              <ul className="mt-1 list-disc pl-4 text-foreground/60">
                {diff.configChanges.map((change, i) => (
                  <li key={i}>
                    {change.configEntryId}
                    {change.changeReason && ` — ${change.changeReason}`}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {diff.commitMessages.length === 0 &&
            diff.configChanges.length === 0 &&
            !diff.commitRange && (
              <p className="text-foreground/40">
                No diff data available for this deployment.
              </p>
            )}
        </div>
      )}
    </div>
  );
}
