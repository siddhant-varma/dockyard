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

/** Valid discovery source types. */
const SOURCE_TYPES = ["filesystem", "dokploy", "github", "manual"] as const;
type SourceType = (typeof SOURCE_TYPES)[number];

/** Config field definitions per source type. */
const SOURCE_CONFIG_FIELDS: Record<SourceType, Array<{ key: string; label: string; placeholder: string }>> = {
  filesystem: [
    { key: "path", label: "Scan Path", placeholder: "/home/user/projects" },
  ],
  dokploy: [
    { key: "apiUrl", label: "Dokploy API URL", placeholder: "https://dokploy.example.com/api" },
    { key: "apiKey", label: "API Key", placeholder: "dk_..." },
  ],
  github: [
    { key: "org", label: "Organization (leave empty for user repos)", placeholder: "my-org" },
    { key: "user", label: "Username (leave empty for org repos)", placeholder: "my-username" },
    { key: "token", label: "Personal Access Token", placeholder: "ghp_..." },
  ],
  manual: [],
};

interface DiscoverySource {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  lastScanAt?: string;
}

export function SourcesTab() {
  const [sources, setSources] = useState<DiscoverySource[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addType, setAddType] = useState<SourceType>("filesystem");
  const [addName, setAddName] = useState("");
  const [addConfig, setAddConfig] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<{ found: number; created: number; updated: number } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchSources = useCallback(async () => {
    try {
      const res = await fetch("/api/discovery/sources");
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
      const res = await fetch("/api/discovery");
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Scan failed" }));
        setActionError(err.error ?? "Scan failed");
      } else {
        const data = await res.json();
        setScanResult({ found: data.found ?? 0, created: data.created ?? 0, updated: data.updated ?? 0 });
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
      const res = await fetch(`/api/discovery/sources/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !currentlyEnabled }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to update source" }));
        setActionError(err.error ?? "Failed to update source");
        return;
      }
      setSources((prev) =>
        prev.map((s) => (s.id === id ? { ...s, enabled: !currentlyEnabled } : s))
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
      const res = await fetch(`/api/discovery/sources/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to delete source" }));
        setActionError(err.error ?? "Failed to delete source");
        return;
      }
      setSources((prev) => prev.filter((s) => s.id !== id));
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
      const isOptional = addType === "github" && (field.key === "org" || field.key === "user");
      if (!value && !isOptional) {
        setAddError(`${field.label} is required.`);
        return;
      }
      if (value) config[field.key] = value;
    }

    setAdding(true);
    try {
      const res = await fetch("/api/discovery/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: addType,
          name: addName.trim(),
          config,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to add source" }));
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
                Found {scanResult.found} project{scanResult.found !== 1 ? "s" : ""}
                {scanResult.created > 0 && `, ${scanResult.created} new`}
                {scanResult.updated > 0 && `, ${scanResult.updated} updated`}
              </p>
            </div>
          )}
          {loading ? (
            <p className="text-xs text-foreground/40">Loading...</p>
          ) : sources.length === 0 ? (
            <p className="text-xs text-foreground/40">No discovery sources configured. Click Scan Now to auto-create defaults.</p>
          ) : (
            sources.map((s) => (
              <div
                key={s.id}
                className={`flex items-center justify-between rounded-lg border border-glass-border bg-card/50 p-3 ${
                  !s.enabled ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <div>
                    <p className={`text-sm font-medium text-foreground/80 ${!s.enabled ? "line-through" : ""}`}>
                      {s.name}
                    </p>
                    <p className="text-xs text-foreground/40">
                      {s.type}
                      {s.lastScanAt ? ` — last scan ${new Date(s.lastScanAt).toLocaleString()}` : ""}
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
                <Label className="text-xs text-foreground/60">{field.label}</Label>
                <Input
                  value={addConfig[field.key] ?? ""}
                  onChange={(e) => handleConfigChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  type={field.key.toLowerCase().includes("key") || field.key.toLowerCase().includes("token") ? "password" : "text"}
                  className="bg-glass-input border-glass-border text-sm"
                />
              </div>
            ))}

            {addType === "manual" && (
              <p className="text-xs text-foreground/40">
                Manual sources have no config — projects are added individually via the API or UI.
              </p>
            )}

            {addError && (
              <p className="text-xs text-red-400">{addError}</p>
            )}

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
