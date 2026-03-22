"use client";

/**
 * Client component for creating a new incident.
 *
 * Renders as a "+ Create Incident" button that expands into an inline form.
 * Submits POST /api/incidents with { projectId, title, severity }.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const SEVERITIES = ["sev1", "sev2", "sev3"] as const;

interface Project {
  id: string;
  name: string;
}

interface CreateIncidentFormProps {
  /** Available projects for the project selector. */
  projects: Project[];
}

/**
 * Inline incident creation form.
 *
 * Requires at least one project to be available. On success, refreshes the
 * server component data and collapses back to the button state.
 */
export function CreateIncidentForm({ projects }: CreateIncidentFormProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState<string>("sev2");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");

  function reset() {
    setTitle("");
    setSeverity("sev2");
    setProjectId(projects[0]?.id ?? "");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (!projectId) {
      setError("A project must be selected");
      return;
    }

    try {
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          title: title.trim(),
          severity,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `Failed (${res.status})`);
        return;
      }

      reset();
      setIsOpen(false);
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setError("Network error");
    }
  }

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="text-xs"
        onClick={() => setIsOpen(true)}
      >
        + Create Incident
      </Button>
    );
  }

  const inputCls =
    "rounded-md border border-glass-border bg-background/50 px-2 py-1.5 text-xs text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-1 focus:ring-ring";

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {/* Title */}
        <input
          className={`${inputCls} sm:col-span-3`}
          placeholder="Incident title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        {/* Project */}
        <select
          className={inputCls}
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {/* Severity */}
        <select
          className={inputCls}
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
        >
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {s.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="sm" className="text-xs" disabled={isPending}>
          {isPending ? "Creating..." : "Create"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => {
            reset();
            setIsOpen(false);
          }}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
