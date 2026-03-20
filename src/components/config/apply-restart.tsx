"use client";

/**
 * ApplyRestart — triggers a config apply + redeploy for a project.
 *
 * Client component. On click, calls POST /api/projects/[slug]/config/apply
 * and transitions through three status states:
 *   idle -> saving -> redeploying -> live (or error)
 *
 * The "redeploying" state is inferred once the API responds with a
 * deployEventId, because the actual deploy is tracked asynchronously
 * via Inngest. A brief timeout is used to surface the "Live" state
 * as a UX confirmation before resetting.
 *
 * @param slug - Project URL slug used to build the API path.
 */

import { useState } from "react";

type ApplyStatus = "idle" | "saving" | "redeploying" | "live" | "error";

interface ApplyRestartProps {
  slug: string;
}

const STATUS_LABEL: Record<ApplyStatus, string> = {
  idle: "Apply & Redeploy",
  saving: "Saving...",
  redeploying: "Redeploying...",
  live: "Live",
  error: "Retry",
};

export function ApplyRestart({ slug }: ApplyRestartProps) {
  const [status, setStatus] = useState<ApplyStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isActive =
    status === "saving" || status === "redeploying" || status === "live";

  async function handleApply() {
    if (isActive) return;

    setStatus("saving");
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/projects/${slug}/config/apply`, {
        method: "POST",
      });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      setStatus("redeploying");

      // The deploy is async (tracked via Inngest). Show "Live" after a
      // short delay as a confirmation that the deploy was triggered.
      setTimeout(() => {
        setStatus("live");
        setTimeout(() => setStatus("idle"), 3000);
      }, 2000);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to apply config"
      );
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void handleApply()}
          disabled={status === "saving" || status === "redeploying"}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
            status === "live"
              ? "bg-green-600 text-white dark:bg-green-500"
              : status === "error"
                ? "bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                : "bg-neutral-900 text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
          }`}
        >
          {STATUS_LABEL[status]}
        </button>

        {/* Step indicator */}
        {(status === "saving" ||
          status === "redeploying" ||
          status === "live") && (
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            <Step
              label="Saving"
              active={status === "saving"}
              done={status === "redeploying" || status === "live"}
            />
            <span className="text-neutral-300 dark:text-neutral-600">→</span>
            <Step
              label="Redeploying"
              active={status === "redeploying"}
              done={status === "live"}
            />
            <span className="text-neutral-300 dark:text-neutral-600">→</span>
            <Step label="Live" active={status === "live"} done={false} />
          </div>
        )}
      </div>

      {errorMessage && (
        <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
      )}

      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        Pushes all config entries to the Dokploy deployment platform and
        triggers a redeploy. The project will restart with the updated
        environment variables.
      </p>
    </div>
  );
}

interface StepProps {
  label: string;
  active: boolean;
  done: boolean;
}

function Step({ label, active, done }: StepProps) {
  return (
    <span
      className={
        done
          ? "font-medium text-green-600 dark:text-green-400"
          : active
            ? "font-medium text-neutral-900 dark:text-neutral-100"
            : "text-neutral-400 dark:text-neutral-600"
      }
    >
      {label}
    </span>
  );
}
