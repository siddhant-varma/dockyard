/**
 * Settings tab content components — extracted from the Settings page
 * to keep the page shell under 400 lines.
 *
 * Each function renders one tab's content. GeneralTab is fully wired
 * to the backend; other tabs are scaffolded for future wiring.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STATUS_DOT: Record<string, string> = {
  connected: "bg-green-400",
  active: "bg-green-400",
  authorized: "bg-green-400",
  standby: "bg-yellow-400",
  "not configured": "bg-foreground/20",
};

const STATUS_TEXT: Record<string, string> = {
  connected: "text-green-400",
  active: "text-green-400",
  authorized: "text-green-400",
  standby: "text-yellow-400",
  "not configured": "text-foreground/40",
};

interface PlatformSettings {
  operatingMode: "local" | "vps";
  autoScan: boolean;
  scanInterval: number;
}

export function GeneralTab() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [scanPath, setScanPath] = useState("..");
  const [savingPath, setSavingPath] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSwitchMode = async () => {
    if (!settings) return;
    setSwitching(true);
    try {
      const newMode = settings.operatingMode === "local" ? "vps" : "local";
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operatingMode: newMode }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSettings(updated);
      }
    } finally {
      setSwitching(false);
    }
  };

  const handleSaveScanPath = async () => {
    setSavingPath(true);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: { scanPath },
        }),
      });
    } finally {
      setSavingPath(false);
    }
  };

  const services = [
    {
      name: "Database",
      status: "connected",
      detail: "PostgreSQL",
    },
    {
      name: "Inngest",
      status: process.env.NEXT_PUBLIC_SITE_URL ? "active" : "standby",
      detail: "Background jobs",
    },
    {
      name: "Hetzner",
      status: settings?.operatingMode === "vps" ? "standby" : "not configured",
      detail: settings?.operatingMode === "vps" ? "Set HETZNER_API_TOKEN" : "VPS mode only",
    },
    {
      name: "Dokploy",
      status: settings?.operatingMode === "vps" ? "standby" : "not configured",
      detail: settings?.operatingMode === "vps" ? "Set DOKPLOY_API_URL" : "VPS mode only",
    },
  ];

  const modeLabel = settings?.operatingMode === "vps" ? "VPS / Server" : "Local Development";
  const switchLabel = settings?.operatingMode === "local" ? "Switch to VPS" : "Switch to Local";

  return (
    <div className="space-y-6">
      <Card className="bg-card border-glass-border backdrop-blur-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Environment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground/80">Operating Mode</p>
              <p className="text-xs text-foreground/40">
                {loading ? "Loading..." : modeLabel}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={handleSwitchMode}
              disabled={loading || switching}
            >
              {switching ? "Switching..." : switchLabel}
            </Button>
          </div>
          {settings?.operatingMode === "local" && (
            <div className="space-y-2">
              <Label className="text-xs text-foreground/60">Scan Path</Label>
              <div className="flex gap-2">
                <Input
                  value={scanPath}
                  onChange={(e) => setScanPath(e.target.value)}
                  className="bg-glass-input border-glass-border text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 text-xs"
                  onClick={handleSaveScanPath}
                  disabled={savingPath}
                >
                  {savingPath ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <Label className="text-sm text-foreground/70">Auto-scan Interval</Label>
            <span className="text-sm text-foreground/60">
              {settings ? `${Math.round(settings.scanInterval / 60)}m` : "—"}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-glass-border backdrop-blur-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Service Connections</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {services.map((svc) => (
            <div key={svc.name} className="flex items-center justify-between text-sm">
              <span className="text-foreground/70">{svc.name}</span>
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${STATUS_DOT[svc.status]}`} />
                <span className={`text-xs capitalize ${STATUS_TEXT[svc.status]}`}>
                  {svc.status}
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function ProjectsTab() {
  const [projects, setProjects] = useState<Array<{
    name: string;
    slug: string;
    discoveredVia?: string;
    status?: string;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.ok ? r.json() : { data: [] })
      .then((res) => setProjects(res.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card className="bg-card border-glass-border backdrop-blur-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Active Projects</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-xs text-foreground/40">Loading...</p>
        ) : projects.length === 0 ? (
          <p className="text-xs text-foreground/40">No projects discovered yet. Run a scan from the Sources tab.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-glass-border text-left text-xs text-foreground/40">
                  <th className="pb-2 pr-4 font-medium">Project</th>
                  <th className="pb-2 pr-4 font-medium">Source</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass-border">
                {projects.map((p) => (
                  <tr key={p.slug} className="text-foreground/70">
                    <td className="py-2.5 pr-4 font-medium text-foreground/80">{p.name}</td>
                    <td className="py-2.5 pr-4 text-xs">{p.discoveredVia ?? "—"}</td>
                    <td className="py-2.5 text-xs capitalize">{p.status ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SourcesTab() {
  const [sources, setSources] = useState<Array<{
    id: string;
    name: string;
    type: string;
    enabled: boolean;
    lastScanAt?: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

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
    try {
      await fetch("/api/discovery");
      await fetchSources();
    } finally {
      setScanning(false);
    }
  };

  const handleRemove = async (id: string) => {
    const res = await fetch(`/api/discovery/sources/${id}`, { method: "DELETE" });
    if (res.ok) {
      setSources((prev) => prev.filter((s) => s.id !== id));
    }
  };

  return (
    <Card className="bg-card border-glass-border backdrop-blur-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Discovery Sources</CardTitle>
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
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-xs text-foreground/40">Loading...</p>
        ) : sources.length === 0 ? (
          <p className="text-xs text-foreground/40">No discovery sources configured. Click Scan Now to auto-create defaults.</p>
        ) : (
          sources.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-lg border border-glass-border bg-card/50 p-3"
            >
              <div>
                <p className="text-sm font-medium text-foreground/80">{s.name}</p>
                <p className="text-xs text-foreground/40">
                  {s.type} — {s.enabled ? "enabled" : "disabled"}
                  {s.lastScanAt ? ` — last scan ${new Date(s.lastScanAt).toLocaleString()}` : ""}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-red-400"
                onClick={() => handleRemove(s.id)}
              >
                Remove
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function NotificationsTab() {
  const channels = [
    { name: "Slack", placeholder: "https://hooks.slack.com/...", status: "connected" },
    { name: "Email (Resend)", placeholder: "re_...", status: "standby" },
    { name: "Web Push", placeholder: "Auto-generated on save", status: "not configured" },
  ];

  return (
    <Card className="bg-card border-glass-border backdrop-blur-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Notification Channels</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {channels.map((ch) => (
          <div key={ch.name} className="space-y-2 border-b border-glass-border pb-4 last:border-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground/80">{ch.name}</p>
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${STATUS_DOT[ch.status]}`} />
                <span className={`text-xs capitalize ${STATUS_TEXT[ch.status]}`}>{ch.status}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Input placeholder={ch.placeholder} className="bg-glass-input border-glass-border text-sm" />
              <Button variant="outline" size="sm" className="shrink-0 text-xs">Test</Button>
            </div>
          </div>
        ))}
        <Button size="sm" className="text-xs">Save</Button>
      </CardContent>
    </Card>
  );
}

export function AITab() {
  return (
    <Card className="bg-card border-glass-border backdrop-blur-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">AI Provider Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-foreground/60">Provider</Label>
            <Input defaultValue="Anthropic" className="bg-glass-input border-glass-border text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-foreground/60">Model</Label>
            <Input defaultValue="claude-sonnet-4-5-20250514" className="bg-glass-input border-glass-border text-sm" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-foreground/60">API Key</Label>
          <div className="flex gap-2">
            <Input type="password" defaultValue="sk-ant-xxxxx" className="bg-glass-input border-glass-border text-sm" />
            <Button variant="outline" size="sm" className="shrink-0 text-xs">Test</Button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-sm text-foreground/70">Temperature</Label>
          <span className="font-mono text-sm text-foreground/60">0.7</span>
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-sm text-foreground/70">Max Tokens</Label>
          <span className="font-mono text-sm text-foreground/60">4096</span>
        </div>
        <Button size="sm" className="text-xs">Save</Button>
      </CardContent>
    </Card>
  );
}

export function MFATab() {
  return (
    <div className="space-y-6">
      <Card className="bg-card border-glass-border backdrop-blur-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Passkeys (FIDO2)</CardTitle>
            <Button variant="outline" size="sm" className="text-xs">+ Register Passkey</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-glass-border bg-card/50 p-3">
            <div>
              <p className="text-sm font-medium text-foreground/80">MacBook Pro TouchID</p>
              <p className="text-xs text-foreground/40">Added May 12, 2024</p>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-red-400">Remove</Button>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-card border-glass-border backdrop-blur-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">TOTP Authenticator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex h-32 w-32 items-center justify-center rounded-lg border border-glass-border bg-white">
            <span className="text-xs text-black/40">QR Code</span>
          </div>
          <div className="flex gap-2">
            <Input placeholder="6-digit code" maxLength={6} className="w-32 bg-glass-input border-glass-border text-sm" />
            <Button variant="outline" size="sm" className="text-xs">Verify & Enable</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function AuditTab() {
  const logs = [
    { time: "09:42", actor: "admin", action: "mfa.register", target: "PassKey #2", detail: "TouchID" },
    { time: "09:30", actor: "system", action: "sync.error", target: "GitHub", detail: "Rate limited" },
    { time: "08:15", actor: "admin", action: "project.update", target: "Aether Core", detail: "Phase → 2" },
    { time: "07:50", actor: "admin", action: "config.update", target: "DB_POOL_SIZE", detail: "20 → 50" },
    { time: "07:12", actor: "system", action: "deploy.trigger", target: "Nebula Gateway", detail: "v1.2.3" },
  ];

  return (
    <Card className="bg-card border-glass-border backdrop-blur-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Audit Log</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-glass-border text-left text-xs text-foreground/40">
                <th className="pb-2 pr-4 font-medium">Time</th>
                <th className="pb-2 pr-4 font-medium">Actor</th>
                <th className="pb-2 pr-4 font-medium">Action</th>
                <th className="pb-2 pr-4 font-medium">Target</th>
                <th className="pb-2 font-medium">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-border">
              {logs.map((log, i) => (
                <tr key={i} className="text-foreground/70">
                  <td className="py-2.5 pr-4 font-mono text-xs text-foreground/40">{log.time}</td>
                  <td className="py-2.5 pr-4">{log.actor}</td>
                  <td className="py-2.5 pr-4">
                    <Badge variant="outline" className="text-[10px]">{log.action}</Badge>
                  </td>
                  <td className="py-2.5 pr-4">{log.target}</td>
                  <td className="py-2.5 text-xs text-foreground/60">{log.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-foreground/30">Showing 1-5 of 2,492 entries</p>
      </CardContent>
    </Card>
  );
}
