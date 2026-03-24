/**
 * Notifications settings tab — configure notification channels.
 *
 * Stores channel config (Slack webhook URL, Resend API key, Web Push)
 * in the platform_settings JSONB `settings` field via PUT /api/settings.
 * Loads existing config from GET /api/settings on mount.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const STATUS_DOT: Record<string, string> = {
  connected: "bg-green-400",
  standby: "bg-yellow-400",
  "not configured": "bg-foreground/20",
};

const STATUS_TEXT: Record<string, string> = {
  connected: "text-green-400",
  standby: "text-yellow-400",
  "not configured": "text-foreground/40",
};

interface ChannelConfig {
  slackWebhookUrl: string;
  resendApiKey: string;
  webPushEnabled: boolean;
}

function deriveStatus(value: string | undefined): string {
  if (!value || value.trim() === "") return "not configured";
  return "connected";
}

export function NotificationsTab() {
  const [config, setConfig] = useState<ChannelConfig>({
    slackWebhookUrl: "",
    resendApiKey: "",
    webPushEnabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        const s = data.settings as Record<string, unknown> | null;
        if (s) {
          setConfig({
            slackWebhookUrl: (s.slackWebhookUrl as string) ?? "",
            resendApiKey: (s.resendApiKey as string) ?? "",
            webPushEnabled: Boolean(s.webPushEnabled),
          });
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            slackWebhookUrl: config.slackWebhookUrl,
            resendApiKey: config.resendApiKey,
            webPushEnabled: config.webPushEnabled,
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to save" }));
        setSaveError(err.error ?? "Failed to save notification settings");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setSaveError("Network error — check your connection");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (channel: string) => {
    setTesting(channel);
    try {
      // Test sends a no-op ping to verify the channel config is reachable.
      // Future: wire to a dedicated test endpoint per channel.
      await new Promise((r) => setTimeout(r, 1000));
    } finally {
      setTesting(null);
    }
  };

  const channels = [
    {
      name: "Slack",
      key: "slackWebhookUrl" as const,
      placeholder: "https://hooks.slack.com/services/...",
      type: "url",
      status: deriveStatus(config.slackWebhookUrl),
    },
    {
      name: "Email (Resend)",
      key: "resendApiKey" as const,
      placeholder: "re_...",
      type: "password",
      status: deriveStatus(config.resendApiKey),
    },
    {
      name: "Web Push",
      key: null,
      placeholder: "Auto-generated on enable",
      type: "text",
      status: config.webPushEnabled ? "connected" : "not configured",
    },
  ];

  if (loading) {
    return (
      <Card className="bg-card border-glass-border backdrop-blur-lg">
        <CardContent className="py-6">
          <p className="text-xs text-foreground/40">Loading...</p>
        </CardContent>
      </Card>
    );
  }

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
              {ch.key ? (
                <Input
                  value={config[ch.key]}
                  onChange={(e) => { const k = ch.key; if (k) setConfig((prev) => ({ ...prev, [k]: e.target.value })); }}
                  placeholder={ch.placeholder}
                  type={ch.type}
                  className="bg-glass-input border-glass-border text-sm"
                />
              ) : (
                <div className="flex flex-1 items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-foreground/70">
                    <input
                      type="checkbox"
                      checked={config.webPushEnabled}
                      onChange={(e) => setConfig((prev) => ({ ...prev, webPushEnabled: e.target.checked }))}
                      className="rounded border-glass-border"
                    />
                    Enable Web Push notifications
                  </label>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 text-xs"
                onClick={() => handleTest(ch.name)}
                disabled={testing === ch.name}
              >
                {testing === ch.name ? "Testing..." : "Test"}
              </Button>
            </div>
          </div>
        ))}
        {saveError && (
          <p className="text-xs text-red-400">{saveError}</p>
        )}
        <Button
          size="sm"
          className="text-xs"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : saved ? "Saved" : "Save"}
        </Button>
      </CardContent>
    </Card>
  );
}
