/**
 * Sources settings tab — manage discovery sources.
 *
 * Lists configured sources from GET /api/discovery/sources.
 * Supports Scan Now (POST /api/discovery), Disable/Enable toggle (PUT /api/discovery/sources/:id),
 * and Add Source (POST /api/discovery/sources) with an inline form.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authFetch } from "@/lib/api/auth-fetch";

/** Valid discovery source types. */
const SOURCE_TYPES = ["filesystem", "dokploy", "github", "manual"] as const;
type SourceType = (typeof SOURCE_TYPES)[number];

/** Config field definitions per source type. */
const SOURCE_CONFIG_FIELDS: Record<
  SourceType,
  Array<{ key: string; label: string; placeholder: string }>
> = {
  filesystem: [
    { key: "path", label: "Scan Path", placeholder: "/home/user/projects" },
  ],
  dokploy: [
    {
      key: "apiUrl",
      label: "Dokploy API URL",
      placeholder: "https://dokploy.example.com/api",
    },
    { key: "apiKey", label: "API Key", placeholder: "dk_..." },
  ],
  github: [
    {
      key: "org",
      label: "Organization (leave empty for user repos)",
      placeholder: "my-org",
    },
    {
      key: "user",
      label: "Username (leave empty for org repos)",
      placeholder: "my-username",
    },
    { key: "token", label: "Personal Access Token", placeholder: "ghp_..." },
  ],
  manual: [],
};

interface DiscoverySource {
  id: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
  enabled: boolean;
  lastScanAt?: string;
}

export function SourcesTab() {
  const [sources, setSources] = useState<DiscoverySource[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editConfig, setEditConfig] = useState<Record<string, string>>({});
  const [addType, setAddType] = useState<SourceType>("filesystem");
  const [addName, setAddName] = useState("");
  const [addConfig, setAddConfig] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    valid: boolean;
    user?: string;
    error?: string;
    warning?: string;
    scopes?: string;
  } | null>(null);
  const [scanResult, setScanResult] = useState<{
    found: number;
    created: number;
    updated: number;
  } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchSources = useCallback(async () => {
    try {
      const res = await authFetch("/api/discovery/sources");
      if (res.ok) {
        const data = await res.json();
        setSources(Array.isArray(data) ? data : []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  const handleScan = async () => {
    setScanning(true);
    setScanResult(null);
    setActionError(null);
    try {
      const res = await authFetch("/api/discovery");
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Scan failed" }));
        setActionError(err.error ?? "Scan failed");
      } else {
        const data = await res.json();
        setScanResult({
          found: data.found ?? 0,
          created: data.created ?? 0,
          updated: data.updated ?? 0,
        });
      }
      await fetchSources();
    } catch {
      setActionError("Network error — check your connection");
    } finally {
      setScanning(false);
    }
  };

  const handleToggleEnabled = async (id: string, currentlyEnabled: boolean) => {
    setActionError(null);
    try {
      const res = await authFetch(`/api/discovery/sources/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !currentlyEnabled }),
      });
      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ error: "Failed to update source" }));
        setActionError(err.error ?? "Failed to update source");
        return;
      }
      setSources((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, enabled: !currentlyEnabled } : s
        )
      );
    } catch {
      setActionError("Network error — check your connection");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = window.confirm(
      `Permanently delete "${name}"? This cannot be undone.`
    );
    if (!confirmed) return;
    setActionError(null);
    try {
      const res = await authFetch(`/api/discovery/sources/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ error: "Failed to delete source" }));
        setActionError(err.error ?? "Failed to delete source");
        return;
      }
      setSources((prev) => prev.filter((s) => s.id !== id));
    } catch {
      setActionError("Network error — check your connection");
    }
  };

  const handleStartEdit = (source: DiscoverySource) => {
    setEditingId(source.id);
    setEditName(source.name);
    const cfg: Record<string, string> = {};
    const fields = SOURCE_CONFIG_FIELDS[source.type as SourceType] ?? [];
    for (const f of fields) {
      cfg[f.key] = String(source.config?.[f.key] ?? "");
    }
    setEditConfig(cfg);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setActionError(null);
    const source = sources.find((s) => s.id === editingId);
    if (!source) return;

    try {
      const res = await authFetch(`/api/discovery/sources/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), config: editConfig }),
      });
      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ error: "Failed to update" }));
        setActionError(err.error ?? "Failed to update source");
        return;
      }
      setEditingId(null);
      await fetchSources();
    } catch {
      setActionError("Network error — check your connection");
    }
  };

  const handleAddSource = async () => {
    setAddError(null);

    if (!addName.trim()) {
      setAddError("Name is required.");
      return;
    }

    const fields = SOURCE_CONFIG_FIELDS[addType];
    const config: Record<string, string> = {};
    for (const field of fields) {
      const value = addConfig[field.key]?.trim();
      // GitHub: org and user are optional (backend falls back to authenticated user repos)
      const isOptional =
        addType === "github" && (field.key === "org" || field.key === "user");
      if (!value && !isOptional) {
        setAddError(`${field.label} is required.`);
        return;
      }
      if (value) config[field.key] = value;
    }

    setAdding(true);
    try {
      const res = await authFetch("/api/discovery/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: addType,
          name: addName.trim(),
          config,
        }),
      });

      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ error: "Failed to add source" }));
        setAddError(err.error ?? "Failed to add source");
        return;
      }

      // Reset form and refresh list
      setShowAddForm(false);
      setAddName("");
      setAddConfig({});
      setAddType("filesystem");
      await fetchSources();
    } finally {
      setAdding(false);
    }
  };

  const handleConfigChange = (key: string, value: string) => {
    setAddConfig((prev) => ({ ...prev, [key]: value }));
    // Clear previous test result when config changes
    if (addType === "github") {
      setTestResult(null);
    }
  };

  /** Validate GitHub PAT by calling the test-github endpoint. */
  const handleTestGithub = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await authFetch("/api/discovery/test-github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: addConfig.token ?? "",
          org: addConfig.org ?? "",
          user: addConfig.user ?? "",
        }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({ valid: false, error: "Network error" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-card border-glass-border backdrop-blur-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Discovery Sources</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setShowAddForm((prev) => !prev)}
              >
                {showAddForm ? "Cancel" : "+ Add Source"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={handleScan}
                disabled={scanning}
              >
                {scanning ? "Scanning..." : "Scan Now"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {actionError && (
            <div className="rounded-md border border-red-500/30 bg-red-500/5 p-3">
              <p className="text-xs text-red-400">{actionError}</p>
            </div>
          )}
          {scanResult && (
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
              <p className="text-xs text-emerald-400">
                Found {scanResult.found} project
                {scanResult.found !== 1 ? "s" : ""}
                {scanResult.created > 0 && `, ${scanResult.created} new`}
                {scanResult.updated > 0 && `, ${scanResult.updated} updated`}
              </p>
            </div>
          )}
          {loading ? (
            <p className="text-xs text-foreground/40">Loading...</p>
          ) : sources.length === 0 ? (
            <p className="text-xs text-foreground/40">
              No discovery sources configured. Click Scan Now to auto-create
              defaults.
            </p>
          ) : (
            sources.map((s) => (
              <div
                key={s.id}
                className={`rounded-lg border border-glass-border bg-card/50 p-3 ${
                  !s.enabled ? "opacity-50" : ""
                }`}
              >
                {editingId === s.id ? (
                  /* ── Inline Edit Mode ── */
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-foreground/60">Name</Label>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="bg-glass-input border-glass-border text-sm"
                      />
                    </div>
                    {(SOURCE_CONFIG_FIELDS[s.type as SourceType] ?? []).map(
                      (field) => (
                        <div key={field.key} className="space-y-1.5">
                          <Label className="text-xs text-foreground/60">
                            {field.label}
                          </Label>
                          <Input
                            value={editConfig[field.key] ?? ""}
                            onChange={(e) =>
                              setEditConfig((prev) => ({
                                ...prev,
                                [field.key]: e.target.value,
                              }))
                            }
                            placeholder={field.placeholder}
                            type={
                              field.key.toLowerCase().includes("key") ||
                              field.key.toLowerCase().includes("token")
                                ? "password"
                                : "text"
                            }
                            className="bg-glass-input border-glass-border text-sm"
                          />
                        </div>
                      )
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="text-xs"
                        onClick={handleSaveEdit}
                      >
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* ── View Mode ── */
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div>
                        <p
                          className={`text-sm font-medium text-foreground/80 ${!s.enabled ? "line-through" : ""}`}
                        >
                          {s.name}
                        </p>
                        <p className="text-xs text-foreground/40">
                          {s.type}
                          {s.lastScanAt
                            ? ` — last scan ${new Date(s.lastScanAt).toLocaleString()}`
                            : ""}
                        </p>
                      </div>
                      {!s.enabled && (
                        <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-medium text-foreground/50">
                          Disabled
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-foreground/50"
                        onClick={() => handleStartEdit(s)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`text-xs ${s.enabled ? "text-amber-400" : "text-emerald-400"}`}
                        onClick={() => handleToggleEnabled(s.id, s.enabled)}
                      >
                        {s.enabled ? "Disable" : "Enable"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-red-400"
                        onClick={() => handleDelete(s.id, s.name)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {showAddForm && (
        <Card className="bg-card border-glass-border backdrop-blur-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Add Discovery Source</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-foreground/60">Source Type</Label>
              <select
                value={addType}
                onChange={(e) => {
                  setAddType(e.target.value as SourceType);
                  setAddConfig({});
                  setAddError(null);
                  setTestResult(null);
                }}
                className="w-full rounded-md border border-glass-border bg-glass-input px-3 py-2 text-sm text-foreground"
              >
                {SOURCE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-foreground/60">Name</Label>
              <Input
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder={`My ${addType} source`}
                className="bg-glass-input border-glass-border text-sm"
              />
            </div>

            {SOURCE_CONFIG_FIELDS[addType].map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label className="text-xs text-foreground/60">
                  {field.label}
                </Label>
                <Input
                  value={addConfig[field.key] ?? ""}
                  onChange={(e) =>
                    handleConfigChange(field.key, e.target.value)
                  }
                  placeholder={field.placeholder}
                  type={
                    field.key.toLowerCase().includes("key") ||
                    field.key.toLowerCase().includes("token")
                      ? "password"
                      : "text"
                  }
                  className="bg-glass-input border-glass-border text-sm"
                />
              </div>
            ))}

            {addType === "github" && addConfig.token?.trim() && (
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={handleTestGithub}
                  disabled={testing}
                >
                  {testing ? "Testing..." : "Test Connection"}
                </Button>

                {testResult && (
                  <div
                    className={`rounded-md border p-3 ${
                      testResult.warning
                        ? "border-amber-500/30 bg-amber-500/5"
                        : testResult.valid
                          ? "border-emerald-500/30 bg-emerald-500/5"
                          : "border-red-500/30 bg-red-500/5"
                    }`}
                  >
                    {testResult.valid && !testResult.warning && (
                      <p className="text-xs text-emerald-400">
                        Token valid — authenticated as{" "}
                        <span className="font-medium">{testResult.user}</span>
                        {testResult.scopes && testResult.scopes !== "none" && (
                          <span className="text-foreground/40">
                            {" "}
                            (scopes: {testResult.scopes})
                          </span>
                        )}
                      </p>
                    )}
                    {testResult.warning && (
                      <p className="text-xs text-amber-400">
                        {testResult.warning}
                      </p>
                    )}
                    {!testResult.valid && testResult.error && (
                      <p className="text-xs text-red-400">{testResult.error}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {addType === "manual" && (
              <p className="text-xs text-foreground/40">
                Manual sources have no config — projects are added individually
                via the API or UI.
              </p>
            )}

            {addError && <p className="text-xs text-red-400">{addError}</p>}

            <Button
              size="sm"
              className="text-xs"
              onClick={handleAddSource}
              disabled={adding}
            >
              {adding ? "Adding..." : "Add Source"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
