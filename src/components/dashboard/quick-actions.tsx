"use client";

/**
 * QuickActions — project selector + action buttons for the Home dashboard.
 *
 * Matches WIREFRAMES.md: [project-alpha ▾] [Redeploy] [Quick Env Update]
 *
 * - Redeploy calls POST /api/projects/:slug/config/apply to trigger a
 *   redeploy through the Dokploy deploy platform API.
 * - Quick Env Update opens an inline form to set a single environment
 *   variable, then applies and redeploys.
 */

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";

/** localStorage key for persisting the last-selected project in quick actions. */
const STORAGE_KEY = "dockyard-quick-action-project";

interface QuickActionsProps {
  projects: { slug: string; name: string }[];
}

export function QuickActions({ projects }: QuickActionsProps) {
  const [selectedSlug, setSelectedSlug] = useState(() => {
    if (typeof window === "undefined") return projects[0]?.slug ?? "";
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && projects.some((p) => p.slug === stored)) return stored;
    } catch {
      /* localStorage unavailable — fall through */
    }
    return projects[0]?.slug ?? "";
  });
  const [redeployLoading, setRedeployLoading] = useState(false);
  const [redeployResult, setRedeployResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const [envOpen, setEnvOpen] = useState(false);
  const [envKey, setEnvKey] = useState("");
  const [envValue, setEnvValue] = useState("");
  const [envLoading, setEnvLoading] = useState(false);
  const [envResult, setEnvResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const resultTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Persist selected project slug to localStorage on change. */
  const handleProjectChange = useCallback((slug: string) => {
    setSelectedSlug(slug);
    try {
      localStorage.setItem(STORAGE_KEY, slug);
    } catch {
      /* localStorage unavailable — ignore */
    }
  }, []);

  /** Clear result message after a delay. */
  function flashResult(
    setter: typeof setRedeployResult,
    ok: boolean,
    message: string
  ) {
    setter({ ok, message });
    if (resultTimeout.current) clearTimeout(resultTimeout.current);
    resultTimeout.current = setTimeout(() => setter(null), 4000);
  }

  /** Trigger a redeploy for the selected project via the Dokploy deploy platform API. */
  async function handleRedeploy() {
    if (!selectedSlug) return;
    setRedeployLoading(true);
    setRedeployResult(null);
    try {
      const res = await fetch(
        `/api/projects/${selectedSlug}/config/apply`,
        { method: "POST" }
      );
      if (res.ok) {
        flashResult(setRedeployResult, true, "Redeploy triggered");
      } else {
        const body = await res.json().catch(() => ({}));
        flashResult(
          setRedeployResult,
          false,
          body.error ?? `Failed (${res.status})`
        );
      }
    } catch {
      flashResult(setRedeployResult, false, "Network error");
    } finally {
      setRedeployLoading(false);
    }
  }

  /** Submit a single env variable update and trigger redeploy. */
  async function handleEnvSubmit() {
    if (!selectedSlug || !envKey.trim()) return;
    setEnvLoading(true);
    setEnvResult(null);
    try {
      const res = await fetch(
        `/api/projects/${selectedSlug}/config`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: envKey.trim(), value: envValue }),
        }
      );
      if (res.ok) {
        // Trigger redeploy after env update
        const redeployRes = await fetch(
          `/api/projects/${selectedSlug}/config/apply`,
          { method: "POST" }
        );
        if (redeployRes.ok) {
          flashResult(setEnvResult, true, "Updated & redeploying");
          setEnvKey("");
          setEnvValue("");
          setEnvOpen(false);
        } else {
          const redeployBody = await redeployRes.json().catch(() => ({}));
          flashResult(
            setEnvResult,
            false,
            redeployBody.error ??
              `Env saved but redeploy failed (${redeployRes.status})`
          );
        }
      } else {
        const body = await res.json().catch(() => ({}));
        flashResult(
          setEnvResult,
          false,
          body.error ?? `Failed (${res.status})`
        );
      }
    } catch {
      flashResult(setEnvResult, false, "Network error");
    } finally {
      setEnvLoading(false);
    }
  }

  const hasProjects = projects.length > 0;

  return (
    <div className="glass rounded-xl px-5 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="rounded-lg border border-glass-border bg-glass-input px-3 py-1.5 text-sm text-foreground backdrop-blur-sm focus:border-[var(--color-brand-500)] focus:outline-none"
          value={selectedSlug}
          onChange={(e) => handleProjectChange(e.target.value)}
        >
          {!hasProjects ? (
            <option>No projects</option>
          ) : (
            projects.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))
          )}
        </select>

        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={!hasProjects || redeployLoading}
          onClick={handleRedeploy}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          {redeployLoading ? "Deploying..." : "Redeploy"}
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={!hasProjects}
          onClick={() => {
            setEnvOpen((prev) => !prev);
            setEnvResult(null);
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Quick Env Update
        </Button>

        {redeployResult && (
          <span
            className={`text-xs ${redeployResult.ok ? "text-green-400" : "text-red-400"}`}
          >
            {redeployResult.message}
          </span>
        )}
        {envResult && (
          <span
            className={`text-xs ${envResult.ok ? "text-green-400" : "text-red-400"}`}
          >
            {envResult.message}
          </span>
        )}
      </div>

      {envOpen && (
        <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-glass-divider pt-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Key
            </label>
            <input
              type="text"
              className="rounded-md border border-glass-border bg-glass-input px-2 py-1 font-mono text-xs text-foreground focus:border-[var(--color-brand-500)] focus:outline-none"
              placeholder="ENV_KEY"
              value={envKey}
              onChange={(e) => setEnvKey(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Value
            </label>
            <input
              type="text"
              className="rounded-md border border-glass-border bg-glass-input px-2 py-1 font-mono text-xs text-foreground focus:border-[var(--color-brand-500)] focus:outline-none"
              placeholder="value"
              value={envValue}
              onChange={(e) => setEnvValue(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            disabled={envLoading || !envKey.trim()}
            onClick={handleEnvSubmit}
          >
            {envLoading ? "Saving..." : "Apply & Redeploy"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => setEnvOpen(false)}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
