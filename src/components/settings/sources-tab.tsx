"use client";

/**
 * SourcesTab — manages discovery sources (filesystem, Dokploy, GitHub).
 *
 * Each source type has its own config fields:
 * - Filesystem: scan path
 * - Dokploy: API URL + API key
 * - GitHub: personal access token + optional org/user
 */

import { useState } from "react";

interface DiscoverySourceItem {
  id: string;
  type: string;
  name: string;
  enabled: boolean;
  lastScanAt: string | null;
  lastScanResult: { found?: number } | null;
}

interface NewSourceState {
  type: string;
  name: string;
  // Filesystem
  path: string;
  // Dokploy
  instanceUrl: string;
  apiKey: string;
  // GitHub
  token: string;
  org: string;
  user: string;
}

const INITIAL_SOURCE: NewSourceState = {
  type: "filesystem",
  name: "",
  path: "..",
  instanceUrl: "",
  apiKey: "",
  token: "",
  org: "",
  user: "",
};

export function SourcesTab({ initial }: { initial: DiscoverySourceItem[] }) {
  const [sources, setSources] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [newSource, setNewSource] = useState<NewSourceState>(INITIAL_SOURCE);

  function buildConfig(): Record<string, unknown> {
    switch (newSource.type) {
      case "filesystem":
        return { path: newSource.path || "..", recursive: false };
      case "dokploy":
        return { instanceUrl: newSource.instanceUrl, apiKey: newSource.apiKey };
      case "github":
        return {
          token: newSource.token,
          ...(newSource.org ? { org: newSource.org } : {}),
          ...(newSource.user ? { user: newSource.user } : {}),
        };
      default:
        return {};
    }
  }

  async function handleAdd() {
    if (!newSource.name) return;
    setAdding(true);
    try {
      const res = await fetch("/api/discovery/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: newSource.type,
          name: newSource.name,
          config: buildConfig(),
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setSources([...sources, created]);
        setNewSource(INITIAL_SOURCE);
      }
    } finally {
      setAdding(false);
    }
  }

  async function handleScanNow() {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await fetch("/api/discovery");
      if (res.ok) {
        const data = await res.json();
        const found = data.discovered ?? data.projects?.length ?? 0;
        setScanResult(`Scan complete: ${found} project(s) found`);
      } else {
        setScanResult("Scan failed");
      }
    } finally {
      setScanning(false);
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
      {/* Scan Now button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleScanNow}
          disabled={scanning}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {scanning ? "Scanning..." : "Scan Now"}
        </button>
        {scanResult && (
          <span className="text-sm text-neutral-600 dark:text-neutral-400">
            {scanResult}
          </span>
        )}
      </div>

      {/* Sources list */}
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
                  {source.lastScanAt && (
                    <>
                      {" "}
                      &middot; Last scan:{" "}
                      {new Date(source.lastScanAt).toLocaleString()}
                    </>
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

      {/* Add Source form */}
      <div className="space-y-3 rounded-md border border-neutral-200 p-4 dark:border-neutral-800">
        <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Add Discovery Source
        </h4>

        <div className="flex gap-2">
          <select
            value={newSource.type}
            onChange={(e) =>
              setNewSource({ ...INITIAL_SOURCE, type: e.target.value })
            }
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          >
            <option value="filesystem">Filesystem</option>
            <option value="dokploy">Dokploy</option>
            <option value="github">GitHub</option>
            <option value="manual">Manual</option>
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
        </div>

        {/* Filesystem config */}
        {newSource.type === "filesystem" && (
          <input
            type="text"
            placeholder="Scan path (e.g., .. or /home/user/projects)"
            value={newSource.path}
            onChange={(e) =>
              setNewSource({ ...newSource, path: e.target.value })
            }
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          />
        )}

        {/* Dokploy config */}
        {newSource.type === "dokploy" && (
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Dokploy API URL (e.g., https://dokploy.example.com)"
              value={newSource.instanceUrl}
              onChange={(e) =>
                setNewSource({ ...newSource, instanceUrl: e.target.value })
              }
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            />
            <input
              type="password"
              placeholder="Dokploy API Key"
              value={newSource.apiKey}
              onChange={(e) =>
                setNewSource({ ...newSource, apiKey: e.target.value })
              }
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
        )}

        {/* GitHub config */}
        {newSource.type === "github" && (
          <div className="space-y-2">
            <input
              type="password"
              placeholder="GitHub Personal Access Token (required)"
              value={newSource.token}
              onChange={(e) =>
                setNewSource({ ...newSource, token: e.target.value })
              }
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            />
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Organization (optional)"
                value={newSource.org}
                onChange={(e) =>
                  setNewSource({ ...newSource, org: e.target.value })
                }
                className="flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              />
              <input
                type="text"
                placeholder="User (optional)"
                value={newSource.user}
                onChange={(e) =>
                  setNewSource({ ...newSource, user: e.target.value })
                }
                className="flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              />
            </div>
            <p className="text-xs text-neutral-500">
              Token needs <code>repo</code> scope for private repos or{" "}
              <code>public_repo</code> for public only.
            </p>
          </div>
        )}

        <button
          onClick={handleAdd}
          disabled={adding || !newSource.name}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {adding ? "Adding..." : "Add Source"}
        </button>
      </div>
    </div>
  );
}
