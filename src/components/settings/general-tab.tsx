/**
 * General settings tab — environment config, operating mode, service connections.
 *
 * Fetches from GET /api/settings, saves via PUT /api/settings.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authFetch } from "@/lib/api/auth-fetch";

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
  const { data: session } = useSession();
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [scanPath, setScanPath] = useState("..");
  const [savingPath, setSavingPath] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [revokeConfirm, setRevokeConfirm] = useState(false);
  const [revokeSuccess, setRevokeSuccess] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await authFetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        const savedPath = (data.settings as Record<string, unknown> | null)
          ?.scanPath;
        if (typeof savedPath === "string") {
          setScanPath(savedPath);
        }
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
    setError(null);
    try {
      const newMode = settings.operatingMode === "local" ? "vps" : "local";
      const res = await authFetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operatingMode: newMode }),
      });
      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ error: "Failed to switch mode" }));
        setError(err.error ?? "Failed to switch mode");
        return;
      }
      const updated = await res.json();
      setSettings(updated);
    } catch {
      setError("Network error — check your connection");
    } finally {
      setSwitching(false);
    }
  };

  const handleSaveScanPath = async () => {
    setSavingPath(true);
    setError(null);
    try {
      const res = await authFetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: { scanPath },
        }),
      });
      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ error: "Failed to save scan path" }));
        setError(err.error ?? "Failed to save scan path");
      }
    } catch {
      setError("Network error — check your connection");
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
      detail:
        settings?.operatingMode === "vps"
          ? "Set HETZNER_API_TOKEN"
          : "VPS mode only",
    },
    {
      name: "Dokploy",
      status: settings?.operatingMode === "vps" ? "standby" : "not configured",
      detail:
        settings?.operatingMode === "vps"
          ? "Set DOKPLOY_API_URL"
          : "VPS mode only",
    },
  ];

  const modeLabel =
    settings?.operatingMode === "vps" ? "VPS / Server" : "Local Development";
  const switchLabel =
    settings?.operatingMode === "local" ? "Switch to VPS" : "Switch to Local";

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/5 p-3">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}
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
            <Label className="text-sm text-foreground/70">
              Auto-scan Interval
            </Label>
            <span className="text-sm text-foreground/60">
              {settings
                ? `${Math.round(settings.scanInterval / 60)}m`
                : "\u2014"}
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
            <div
              key={svc.name}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-foreground/70">{svc.name}</span>
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${STATUS_DOT[svc.status]}`}
                />
                <span
                  className={`text-xs capitalize ${STATUS_TEXT[svc.status]}`}
                >
                  {svc.status}
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Security — only visible to superadmins when auth is enabled */}
      {process.env.NEXT_PUBLIC_AUTH_ENABLED === "true" &&
        session?.user?.role === "superadmin" && (
          <Card className="bg-card border-glass-border backdrop-blur-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground/80">
                    Force Logout All Sessions
                  </p>
                  <p className="text-xs text-foreground/40">
                    Revoke all active sessions. Users will need to sign in
                    again.
                  </p>
                </div>
                {!revokeConfirm ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                    onClick={() => setRevokeConfirm(true)}
                    disabled={revoking}
                  >
                    Revoke All
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setRevokeConfirm(false)}
                      disabled={revoking}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs bg-red-600 hover:bg-red-700 text-white"
                      disabled={revoking}
                      onClick={async () => {
                        setRevoking(true);
                        setError(null);
                        setRevokeSuccess(false);
                        try {
                          const res = await authFetch(
                            "/api/settings/sessions/revoke",
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ scope: "all" }),
                            }
                          );
                          if (!res.ok) {
                            const err = await res.json().catch(() => ({
                              error: "Failed to revoke sessions",
                            }));
                            setError(
                              ((err as Record<string, unknown>)
                                .error as string) ?? "Failed to revoke sessions"
                            );
                          } else {
                            setRevokeSuccess(true);
                            setTimeout(() => setRevokeSuccess(false), 3000);
                          }
                        } catch {
                          setError("Network error — check your connection");
                        } finally {
                          setRevoking(false);
                          setRevokeConfirm(false);
                        }
                      }}
                    >
                      {revoking ? "Revoking..." : "Confirm Revoke"}
                    </Button>
                  </div>
                )}
              </div>
              {revokeSuccess && (
                <p className="text-xs text-green-400">
                  All sessions revoked. Users will be signed out on their next
                  request.
                </p>
              )}
            </CardContent>
          </Card>
        )}
    </div>
  );
}
