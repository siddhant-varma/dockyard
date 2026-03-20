/**
 * DipConfig — DIP level configuration for project settings.
 *
 * Shows DIP level radio buttons with descriptions. Glass Observatory styling.
 *
 * @param projectSlug - The project's URL slug for API calls.
 * @param currentLevel - The project's current DIP integration level.
 */

"use client";

import { useState } from "react";

interface DipConfigProps {
  projectSlug: string;
  currentLevel: number;
}

const DIP_LEVELS = [
  {
    level: 0,
    name: "None",
    description:
      "No integration — DockYard discovers the project but cannot monitor it.",
  },
  {
    level: 1,
    name: "Health",
    description:
      "Project exposes /healthz endpoint. DockYard polls for health status.",
  },
  {
    level: 2,
    name: "Metrics",
    description:
      "Project exposes /metrics (Prometheus format). DockYard scrapes metrics every 60s.",
  },
  {
    level: 3,
    name: "Events",
    description:
      "Project sends CloudEvents to DockYard. Full lifecycle tracking.",
  },
];

export function DipConfig({ projectSlug, currentLevel }: DipConfigProps) {
  const [level, setLevel] = useState(currentLevel);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`/api/projects/${projectSlug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dipLevel: level }),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {DIP_LEVELS.map((l) => (
          <label
            key={l.level}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 backdrop-blur-sm transition-colors ${
              level === l.level
                ? "border-[var(--color-brand-500)]/40 bg-[var(--color-brand-500)]/10"
                : "border-glass-border bg-glass-bg hover:bg-glass-hover"
            }`}
          >
            <input
              type="radio"
              name="dip-level"
              value={l.level}
              checked={level === l.level}
              onChange={() => setLevel(l.level)}
              className="mt-1 accent-[var(--color-brand-500)]"
            />
            <div>
              <span className="text-sm font-medium text-foreground">
                Level {l.level}: {l.name}
              </span>
              <p className="text-xs text-muted-foreground/60">
                {l.description}
              </p>
            </div>
          </label>
        ))}
      </div>
      <button
        onClick={handleSave}
        disabled={saving || level === currentLevel}
        className="rounded-lg bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-brand-600)] disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}
