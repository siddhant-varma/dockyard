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
          <span className="text-sm text-muted-foreground">
            {scanResult}
          </span>
        )}
      </div>

      {/* Sources list */}
      <div className="divide-y divide-glass-divider rounded-md border border-glass-border">
        {sources.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No discovery sources configured.
          </div>
        ) : (
          sources.map((source) => (
            <div
              key={source.id}
              className="flex items-center justify-between p-3"
            >
              <div>
                <div className="text-sm font-medium text-foreground">
                  {source.name}
                </div>
                <div className="text-xs text-muted-foreground">
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
                      : "bg-glass-hover text-muted-foreground"
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
      <div className="space-y-3 rounded-md border border-glass-border p-4">
        <h4 className="text-sm font-medium text-foreground/80">
          Add Discovery Source
        </h4>

        <div className="flex gap-2">
          <select
            value={newSource.type}
            onChange={(e) =>
              setNewSource({ ...INITIAL_SOURCE, type: e.target.value })
            }
            className="rounded-md border border-glass-border-strong bg-glass-input px-3 py-2 text-sm"
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
            className="flex-1 rounded-md border border-glass-border-strong bg-glass-input px-3 py-2 text-sm"
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
            className="w-full rounded-md border border-glass-border-strong bg-glass-input px-3 py-2 text-sm"
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
              className="w-full rounded-md border border-glass-border-strong bg-glass-input px-3 py-2 text-sm"
            />
            <input
              type="password"
              placeholder="Dokploy API Key"
              value={newSource.apiKey}
              onChange={(e) =>
                setNewSource({ ...newSource, apiKey: e.target.value })
              }
              className="w-full rounded-md border border-glass-border-strong bg-glass-input px-3 py-2 text-sm"
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
              className="w-full rounded-md border border-glass-border-strong bg-glass-input px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Organization (optional)"
                value={newSource.org}
                onChange={(e) =>
                  setNewSource({ ...newSource, org: e.target.value })
                }
                className="flex-1 rounded-md border border-glass-border-strong bg-glass-input px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="User (optional)"
                value={newSource.user}
                onChange={(e) =>
                  setNewSource({ ...newSource, user: e.target.value })
                }
                className="flex-1 rounded-md border border-glass-border-strong bg-glass-input px-3 py-2 text-sm"
              />
            </div>
            <p className="text-xs text-muted-foreground">
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
