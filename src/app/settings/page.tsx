/**
 * Settings page — /settings
 *
 * Client component for interactive tab switching.
 * 7 tabs: General, Projects, Sources, Notifications, AI, MFA, Audit.
 * Matches Stitch "DockYard Settings (Full Overview)" wireframe + WIREFRAMES.md §2-7.
 */

"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageTabs } from "@/components/layout/page-tabs";

const HOME_TABS = [
  { label: "Dashboard", href: "/" },
  { label: "Settings", href: "/settings" },
  { label: "Self-Health", href: "/self-health" },
];

const SETTINGS_TABS = [
  "General",
  "Projects",
  "Sources",
  "Notifications",
  "AI",
  "MFA",
  "Audit",
] as const;

type SettingsTab = (typeof SETTINGS_TABS)[number];

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

/* ── Tab content components ──────────────────────────── */

function GeneralTab() {
  const services = [
    { name: "Database", status: "connected", detail: "PostgreSQL localhost:5433" },
    { name: "Inngest", status: "active", detail: "14 functions" },
    { name: "Hetzner", status: "not configured", detail: "Set HETZNER_API_TOKEN" },
    { name: "Dokploy", status: "not configured", detail: "Set DOKPLOY_API_URL" },
    { name: "GitHub", status: "authorized", detail: "Token: ghp_***" },
  ];

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
              <p className="text-xs text-foreground/40">Local Development</p>
            </div>
            <Button variant="outline" size="sm" className="text-xs">
              Switch to VPS
            </Button>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-foreground/50">Scan Path</Label>
            <Input
              defaultValue="~/dev/projects"
              className="bg-glass-input border-glass-border text-sm"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm text-foreground/70">Auto-scan Interval</Label>
            <span className="text-sm text-foreground/60">15m</span>
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

function ProjectsTab() {
  const projects = [
    { name: "Aether Core", sources: "GitHub, Filesystem", health: "Healthy" },
    { name: "Nebula Gateway", sources: "Dokploy", health: "Degraded" },
    { name: "Solaris DB", sources: "GitHub", health: "Healthy" },
  ];

  return (
    <Card className="bg-card border-glass-border backdrop-blur-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Active Projects</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-glass-border text-left text-xs text-foreground/40">
                <th className="pb-2 pr-4 font-medium">Project</th>
                <th className="pb-2 pr-4 font-medium">Sources</th>
                <th className="pb-2 font-medium">Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-border">
              {projects.map((p) => (
                <tr key={p.name} className="text-foreground/70">
                  <td className="py-2.5 pr-4 font-medium text-foreground/80">{p.name}</td>
                  <td className="py-2.5 pr-4 text-xs">{p.sources}</td>
                  <td className="py-2.5 text-xs">{p.health}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function SourcesTab() {
  const sources = [
    { name: "main-repo-v2", type: "GitHub", detail: "github.com/dockyard/core" },
    { name: "prod-db-cluster", type: "PostgreSQL", detail: "15.4 AWS RDS" },
  ];

  return (
    <div className="space-y-4">
      <Card className="bg-card border-glass-border backdrop-blur-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Discovery Sources</CardTitle>
            <Button variant="outline" size="sm" className="text-xs">
              + Add Source
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {sources.map((s) => (
            <div
              key={s.name}
              className="flex items-center justify-between rounded-lg border border-glass-border bg-card/50 p-3"
            >
              <div>
                <p className="text-sm font-medium text-foreground/80">{s.name}</p>
                <p className="text-xs text-foreground/40">
                  {s.type} — {s.detail}
                </p>
              </div>
              <Button variant="ghost" size="sm" className="text-xs text-red-400">
                Remove
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationsTab() {
  const channels = [
    { name: "Slack", field: "Webhook URL", placeholder: "https://hooks.slack.com/...", status: "connected" },
    { name: "Email (Resend)", field: "API Key", placeholder: "re_...", status: "standby" },
    { name: "Web Push", field: "VAPID Public Key", placeholder: "Auto-generated on save", status: "not configured" },
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
                <span className={`text-xs capitalize ${STATUS_TEXT[ch.status]}`}>
                  {ch.status}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder={ch.placeholder}
                className="bg-glass-input border-glass-border text-sm"
              />
              <Button variant="outline" size="sm" className="shrink-0 text-xs">
                Test
              </Button>
            </div>
          </div>
        ))}
        <Button size="sm" className="text-xs">Save</Button>
      </CardContent>
    </Card>
  );
}

function AITab() {
  return (
    <Card className="bg-card border-glass-border backdrop-blur-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">AI Provider Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-foreground/50">Provider</Label>
            <Input
              defaultValue="Anthropic"
              className="bg-glass-input border-glass-border text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-foreground/50">Model</Label>
            <Input
              defaultValue="claude-sonnet-4-5-20250514"
              className="bg-glass-input border-glass-border text-sm"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-foreground/50">API Key</Label>
          <div className="flex gap-2">
            <Input
              type="password"
              defaultValue="sk-ant-xxxxx"
              className="bg-glass-input border-glass-border text-sm"
            />
            <Button variant="outline" size="sm" className="shrink-0 text-xs">
              Test
            </Button>
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

        <div className="border-t border-glass-border pt-4">
          <p className="mb-2 text-xs text-foreground/40">Usage This Month</p>
          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div className="flex justify-between">
              <span className="text-foreground/50">Prompt tokens</span>
              <span className="font-mono text-foreground/70">125,400</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground/50">Completion</span>
              <span className="font-mono text-foreground/70">45,200</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground/50">Est. cost</span>
              <span className="font-mono text-foreground/70">$0.82</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground/50">Generations</span>
              <span className="font-mono text-foreground/70">12</span>
            </div>
          </div>
        </div>
        <Button size="sm" className="text-xs">Save</Button>
      </CardContent>
    </Card>
  );
}

function MFATab() {
  return (
    <div className="space-y-6">
      <Card className="bg-card border-glass-border backdrop-blur-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Passkeys (FIDO2)</CardTitle>
            <Button variant="outline" size="sm" className="text-xs">
              + Register Passkey
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-glass-border bg-card/50 p-3">
            <div>
              <p className="text-sm font-medium text-foreground/80">
                MacBook Pro TouchID
              </p>
              <p className="text-xs text-foreground/40">Added May 12, 2024</p>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-red-400">
              Remove
            </Button>
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
            <Input
              placeholder="6-digit code"
              maxLength={6}
              className="w-32 bg-glass-input border-glass-border text-sm"
            />
            <Button variant="outline" size="sm" className="text-xs">
              Verify & Enable
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AuditTab() {
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
                  <td className="py-2.5 pr-4 font-mono text-xs text-foreground/40">
                    {log.time}
                  </td>
                  <td className="py-2.5 pr-4">{log.actor}</td>
                  <td className="py-2.5 pr-4">
                    <Badge variant="outline" className="text-[10px]">
                      {log.action}
                    </Badge>
                  </td>
                  <td className="py-2.5 pr-4">{log.target}</td>
                  <td className="py-2.5 text-xs text-foreground/50">{log.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-foreground/30">
          Showing 1-5 of 2,492 entries
        </p>
      </CardContent>
    </Card>
  );
}

/* ── Tab content map ─────────────────────────────────── */

const TAB_CONTENT: Record<SettingsTab, () => React.JSX.Element> = {
  General: GeneralTab,
  Projects: ProjectsTab,
  Sources: SourcesTab,
  Notifications: NotificationsTab,
  AI: AITab,
  MFA: MFATab,
  Audit: AuditTab,
};

/* ── Main page ───────────────────────────────────────── */

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("General");
  const Content = TAB_CONTENT[activeTab];

  return (
    <div className="space-y-6">
      <PageTabs tabs={HOME_TABS} />

      <h1 className="text-lg font-semibold text-foreground">Settings</h1>

      {/* Settings sub-tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-glass-border">
        {SETTINGS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 px-3 py-2 text-sm transition-colors ${
              activeTab === tab
                ? "border-b-2 border-[var(--color-brand-500)] text-foreground"
                : "text-foreground/40 hover:text-foreground/60"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <Content />
    </div>
  );
}
