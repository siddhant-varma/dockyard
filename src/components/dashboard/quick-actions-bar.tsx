/**
 * QuickActionsBar — horizontal action bar for one-click operations.
 */

"use client";

import { useState } from "react";

interface QuickActionsBarProps {
  projects: Array<{ slug: string; name: string }>;
}

export function QuickActionsBar({ projects }: QuickActionsBarProps) {
  const [selectedSlug, setSelectedSlug] = useState(projects[0]?.slug ?? "");
  const [deploying, setDeploying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleRedeploy() {
    if (!selectedSlug) return;
    setDeploying(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/projects/${selectedSlug}/deployments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "redeploy" }),
      });
      setMessage(res.ok ? "Redeploy triggered" : "Redeploy failed");
    } finally {
      setDeploying(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
      <select
        value={selectedSlug}
        onChange={(e) => setSelectedSlug(e.target.value)}
        className="rounded border px-2 py-1.5 text-sm"
      >
        {projects.map((p) => (
          <option key={p.slug} value={p.slug}>{p.name}</option>
        ))}
      </select>

      <button
        onClick={handleRedeploy}
        disabled={deploying || !selectedSlug}
        className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {deploying ? "Deploying..." : "Redeploy"}
      </button>

      {message && <span className="text-sm text-gray-600">{message}</span>}
    </div>
  );
}
