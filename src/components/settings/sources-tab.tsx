"use client";

import { useState } from "react";

interface DiscoverySourceItem {
  id: string;
  type: string;
  name: string;
  enabled: boolean;
  lastScanAt: string | null;
  lastScanResult: { found?: number } | null;
}

export function SourcesTab({ initial }: { initial: DiscoverySourceItem[] }) {
  const [sources, setSources] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [newSource, setNewSource] = useState({
    type: "filesystem",
    name: "",
    path: "..",
  });

  async function handleAdd() {
    if (!newSource.name) return;
    setAdding(true);
    try {
      const config =
        newSource.type === "filesystem"
          ? { path: newSource.path }
          : { instanceUrl: "", apiKey: "" };

      const res = await fetch("/api/discovery/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: newSource.type,
          name: newSource.name,
          config,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setSources([...sources, created]);
        setNewSource({ type: "filesystem", name: "", path: ".." });
      }
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/discovery/sources/${id}`, { method: "DELETE" });
    setSources(sources.filter((s) => s.id !== id));
  }

  async function handleToggle(id: string, enabled: boolean) {
    await fetch(`/api/discovery/sources/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    setSources(sources.map((s) => (s.id === id ? { ...s, enabled } : s)));
  }

  return (
    <div className="space-y-6">
      <div className="divide-y divide-neutral-200 rounded-md border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {sources.length === 0 ? (
          <div className="p-4 text-center text-sm text-neutral-500">
            No discovery sources configured.
          </div>
        ) : (
          sources.map((source) => (
            <div
              key={source.id}
              className="flex items-center justify-between p-3"
            >
              <div>
                <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {source.name}
                </div>
                <div className="text-xs text-neutral-500">
                  {source.type}
                  {source.lastScanResult?.found != null && (
                    <> &middot; {source.lastScanResult.found} found</>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggle(source.id, !source.enabled)}
                  className={`rounded px-2 py-1 text-xs ${
                    source.enabled
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                      : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800"
                  }`}
                >
                  {source.enabled ? "Enabled" : "Disabled"}
                </button>
                <button
                  onClick={() => handleDelete(source.id)}
                  className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="space-y-3 rounded-md border border-neutral-200 p-4 dark:border-neutral-800">
        <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Add Source
        </h4>
        <div className="flex gap-2">
          <select
            value={newSource.type}
            onChange={(e) =>
              setNewSource({ ...newSource, type: e.target.value })
            }
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          >
            <option value="filesystem">Filesystem</option>
            <option value="dokploy">Dokploy</option>
            <option value="github">GitHub</option>
          </select>
          <input
            type="text"
            placeholder="Source name"
            value={newSource.name}
            onChange={(e) =>
              setNewSource({ ...newSource, name: e.target.value })
            }
            className="flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          />
          {newSource.type === "filesystem" && (
            <input
              type="text"
              placeholder="Path (e.g., ..)"
              value={newSource.path}
              onChange={(e) =>
                setNewSource({ ...newSource, path: e.target.value })
              }
              className="w-40 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            />
          )}
          <button
            onClick={handleAdd}
            disabled={adding || !newSource.name}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
