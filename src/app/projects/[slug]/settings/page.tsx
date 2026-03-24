/**
 * Project Settings page — /projects/[slug]/settings
 *
 * DIP level selector, connection strength, notification overrides,
 * and Uptime Kuma monitoring status.
 */

"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PageTabs } from "@/components/layout/page-tabs";
import { buildProjectTabs } from "@/components/projects/project-tabs";
import { useReAuth } from "@/components/auth/reauth-modal";

const INTERNAL_BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Shape of a Kuma monitor record from the API. */
interface KumaMonitorInfo {
  id: string;
  kumaMonitorId: number;
  monitorType: string;
  name: string;
  url: string;
  interval: number;
  status: string;
}

const DIP_LEVELS = [
  { level: 1, name: "Passive", desc: "Health checks only" },
  { level: 2, name: "Active", desc: "+ Deployments & config" },
  { level: 3, name: "Integrated", desc: "+ Webhooks & metrics" },
  { level: 4, name: "Full", desc: "+ AI insights & auto-actions" },
];

export default function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const { requireReAuth, ReAuthGate } = useReAuth();

  // Controlled state for DIP level
  const [dipLevel, setDipLevel] = useState(2);

  // Controlled state for notification toggles
  const [notifications, setNotifications] = useState({
    deployNotifications: true,
    alertEscalations: true,
    weeklyAiSummaries: false,
  });

  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Kuma monitoring state
  const [kumaMonitors, setKumaMonitors] = useState<KumaMonitorInfo[]>([]);
  const [monitorsLoading, setMonitorsLoading] = useState(true);

  const fetchMonitors = useCallback(async () => {
    try {
      const res = await fetch(
        `${INTERNAL_BASE}/api/projects/${slug}/monitors`
      );
      if (res.ok) {
        const data = (await res.json()) as { monitors: KumaMonitorInfo[] };
        setKumaMonitors(data.monitors ?? []);
      }
    } catch {
      // Non-critical — monitoring section degrades gracefully
    } finally {
      setMonitorsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchMonitors();
  }, [fetchMonitors]);

  /** Save Settings — PUT /api/projects/:slug with DIP level + notification prefs. */
  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch(`${INTERNAL_BASE}/api/projects/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dipLevel,
          notifications,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as Record<string, string>).error ??
            `Request failed (${res.status})`,
        );
      }
      setFeedback({ type: "success", message: "Settings saved." });
    } catch (err) {
      setFeedback({
        type: "error",
        message:
          err instanceof Error ? err.message : "Failed to save settings.",
      });
    } finally {
      setSaving(false);
    }
  };

  /** Archive Project — DELETE /api/projects/:slug with confirmation. */
  const handleArchive = async () => {
    const confirmed = await requireReAuth(
      "Archive this project? It will be hidden from dashboards and health monitoring will stop."
    );
    if (!confirmed) return;

    setArchiving(true);
    setFeedback(null);
    try {
      const res = await fetch(`${INTERNAL_BASE}/api/projects/${slug}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as Record<string, string>).error ??
            `Archive failed (${res.status})`,
        );
      }
      router.push("/projects");
    } catch (err) {
      setFeedback({
        type: "error",
        message:
          err instanceof Error ? err.message : "Failed to archive project.",
      });
    } finally {
      setArchiving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageTabs tabs={buildProjectTabs(slug)} />
      <h1 className="text-lg font-semibold text-foreground">
        Project Settings
      </h1>

      {/* DIP Level */}
      <Card className="bg-card border-glass-border backdrop-blur-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            DIP Level (DockYard Integration Protocol)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {DIP_LEVELS.map((dip) => (
            <label
              key={dip.level}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-glass-border p-3 transition-colors hover:bg-glass-hover"
            >
              <input
                type="radio"
                name="dip-level"
                checked={dipLevel === dip.level}
                onChange={() => setDipLevel(dip.level)}
                className="accent-[var(--color-brand-500)]"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground/80">
                    Level {dip.level} — {dip.name}
                  </span>
                </div>
                <p className="text-xs text-foreground/40">{dip.desc}</p>
              </div>
            </label>
          ))}
        </CardContent>
      </Card>

      {/* Connection Strength */}
      <Card className="bg-card border-glass-border backdrop-blur-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Connection Strength</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground/50">Signal health</span>
            <span className="font-mono text-sm font-medium text-foreground/70">
              80%
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/5">
            <div className="h-full w-[80%] rounded-full bg-green-400" />
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span className="text-foreground/60">
                Health checks connected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span className="text-foreground/60">
                Deploy hooks registered
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-foreground/20">○</span>
              <span className="text-foreground/40">
                .dockyard.json not found
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-foreground/20">○</span>
              <span className="text-foreground/40">
                Metrics endpoint not configured
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monitoring (Uptime Kuma) */}
      <Card className="bg-card border-glass-border backdrop-blur-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Monitoring (Uptime Kuma)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {monitorsLoading ? (
            <p className="text-xs text-foreground/40">Loading monitors...</p>
          ) : kumaMonitors.length === 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-foreground/40">No Uptime Kuma monitors linked to this project.</p>
              <p className="text-xs text-foreground/30">
                Monitors are auto-provisioned when Kuma is configured.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {kumaMonitors.map((monitor) => (
                <div
                  key={monitor.id}
                  className="flex items-center justify-between rounded-lg border border-glass-border p-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          monitor.status === "up"
                            ? "bg-green-400"
                            : monitor.status === "down"
                              ? "bg-red-400"
                              : "bg-yellow-400"
                        }`}
                      />
                      <span className="text-sm font-medium text-foreground/80 truncate">
                        {monitor.name}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-foreground/40">
                      <span className="uppercase">{monitor.monitorType}</span>
                      <span className="truncate">{monitor.url}</span>
                      <span>{monitor.interval}s interval</span>
                    </div>
                  </div>
                  <span
                    className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      monitor.status === "up"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : monitor.status === "down"
                          ? "bg-red-500/10 text-red-400"
                          : "bg-yellow-500/10 text-yellow-400"
                    }`}
                  >
                    {monitor.status}
                  </span>
                </div>
              ))}
              {process.env.NEXT_PUBLIC_KUMA_URL && (
                <a
                  href={process.env.NEXT_PUBLIC_KUMA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-xs text-brand-400 hover:underline"
                >
                  Open Kuma Dashboard
                </a>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Overrides */}
      <Card className="bg-card border-glass-border backdrop-blur-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Notification Overrides</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-foreground/70">
              Deploy notifications
            </Label>
            <Switch
              checked={notifications.deployNotifications}
              onCheckedChange={(checked: boolean) =>
                setNotifications((prev) => ({
                  ...prev,
                  deployNotifications: checked,
                }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm text-foreground/70">
              Alert escalations
            </Label>
            <Switch
              checked={notifications.alertEscalations}
              onCheckedChange={(checked: boolean) =>
                setNotifications((prev) => ({
                  ...prev,
                  alertEscalations: checked,
                }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm text-foreground/70">
              Weekly AI summaries
            </Label>
            <Switch
              checked={notifications.weeklyAiSummaries}
              onCheckedChange={(checked: boolean) =>
                setNotifications((prev) => ({
                  ...prev,
                  weeklyAiSummaries: checked,
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`rounded-lg px-4 py-2 text-sm ${
            feedback.type === "success"
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-red-500/10 text-red-400"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          size="sm"
          className="text-xs"
          disabled={saving}
          onClick={handleSave}
        >
          {saving ? "Saving..." : "Save Settings"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-xs text-red-400"
          onClick={handleArchive}
          disabled={archiving}
        >
          {archiving ? "Archiving..." : "Archive Project"}
        </Button>
      </div>

      <ReAuthGate />
    </div>
  );
}
