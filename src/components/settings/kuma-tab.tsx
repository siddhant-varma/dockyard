/**
 * Kuma integration settings tab.
 *
 * Displays Uptime Kuma connection status, configured URL, and the number
 * of monitors. Includes a "Test Connection" button that verifies the
 * Kuma instance is reachable and the credentials are valid.
 *
 * This tab appears in Settings when Kuma env vars are present.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/** Connection test result from the API. */
interface KumaStatus {
  connected: boolean;
  url: string | null;
  monitorCount: number;
  version: string | null;
  error: string | null;
}

const STATUS_DOT: Record<string, string> = {
  connected: "bg-green-400",
  disconnected: "bg-red-400",
  unknown: "bg-foreground/20",
};

const STATUS_TEXT: Record<string, string> = {
  connected: "text-green-400",
  disconnected: "text-red-400",
  unknown: "text-foreground/40",
};

/** Kuma integration settings tab for the Settings page. */
export function KumaTab() {
  const [status, setStatus] = useState<KumaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/settings/kuma");
      if (res.ok) {
        const data = await res.json();
        setStatus(data.data ?? data);
      } else {
        setError("Failed to fetch Kuma status");
      }
    } catch {
      setError("Network error — could not reach DockYard API");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleTestConnection = async () => {
    setTesting(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/kuma/test", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setStatus(data.data ?? data);
      } else {
        const body = await res.json().catch(() => null);
        setError(body?.error?.message ?? "Connection test failed");
      }
    } catch {
      setError("Network error during connection test");
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Card className="bg-card border-glass-border backdrop-blur-lg animate-pulse">
          <CardContent className="h-32 p-6" />
        </Card>
      </div>
    );
  }

  const connectionState = status?.connected
    ? "connected"
    : status
      ? "disconnected"
      : "unknown";

  return (
    <div className="space-y-4">
      {/* Connection status card */}
      <Card className="bg-card border-glass-border backdrop-blur-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">
              Uptime Kuma Integration
            </CardTitle>
            <Badge
              variant="outline"
              className={`text-[10px] ${
                connectionState === "connected"
                  ? "border-green-500/40 bg-green-500/20 text-green-300"
                  : connectionState === "disconnected"
                    ? "border-red-500/40 bg-red-500/20 text-red-300"
                    : "border-white/15 bg-white/10 text-foreground/50"
              }`}
            >
              {connectionState.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connection details */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground/60">Status</span>
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${STATUS_DOT[connectionState]}`}
                />
                <span className={`text-xs capitalize ${STATUS_TEXT[connectionState]}`}>
                  {connectionState}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground/60">URL</span>
              <span className="font-data text-xs text-foreground/80">
                {status?.url ?? "not configured"}
              </span>
            </div>

            {status?.connected && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground/60">Monitors</span>
                  <span className="font-data text-xs tabular-nums text-foreground/80">
                    {status.monitorCount}
                  </span>
                </div>

                {status.version && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground/60">Version</span>
                    <span className="font-data text-xs text-foreground/80">
                      {status.version}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Error message */}
          {(error || status?.error) && (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2">
              <p className="text-xs text-red-400">
                {error || status?.error}
              </p>
            </div>
          )}

          {/* Test Connection button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestConnection}
            disabled={testing}
            className="w-full"
          >
            {testing ? "Testing..." : "Test Connection"}
          </Button>

          {/* Help text */}
          <p className="text-[10px] leading-relaxed text-foreground/30">
            Configure Uptime Kuma by setting KUMA_URL, KUMA_USERNAME, and
            KUMA_PASSWORD in your environment variables. See the Kuma
            integration guide for setup instructions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
