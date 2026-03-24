/**
 * GET /api/settings/kuma
 *
 * Returns Uptime Kuma connection status by pinging the status page
 * heartbeat endpoint (the only unauthenticated REST endpoint Kuma exposes).
 *
 * POST /api/settings/kuma (test connection)
 *
 * Same check but triggered manually from the UI.
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/guards";

interface KumaStatusResponse {
  connected: boolean;
  url: string | null;
  monitorCount: number;
  version: string | null;
  error: string | null;
}

async function checkKumaConnection(): Promise<KumaStatusResponse> {
  const kumaUrl = process.env.KUMA_URL;
  const apiKey = process.env.KUMA_API_KEY;

  if (!kumaUrl) {
    return {
      connected: false,
      url: null,
      monitorCount: 0,
      version: null,
      error: "KUMA_URL not configured",
    };
  }

  if (!apiKey) {
    return {
      connected: false,
      url: kumaUrl,
      monitorCount: 0,
      version: null,
      error: "KUMA_API_KEY not configured",
    };
  }

  try {
    // Kuma's only reliable REST endpoint: status page heartbeat
    // This works without Socket.IO and verifies the instance is reachable
    const res = await fetch(`${kumaUrl}/api/status-page/heartbeat/default`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      // Try without /default — maybe no status page exists yet
      const fallback = await fetch(kumaUrl, {
        signal: AbortSignal.timeout(5000),
      });
      if (!fallback.ok) {
        return {
          connected: false,
          url: kumaUrl,
          monitorCount: 0,
          version: null,
          error: `Kuma returned HTTP ${res.status}`,
        };
      }
    }

    // If we got here, Kuma is reachable
    // Try to get monitor count via the metrics endpoint (requires auth)
    let monitorCount = 0;
    try {
      const metricsRes = await fetch(`${kumaUrl}/metrics`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(5000),
      });
      if (metricsRes.ok) {
        const text = await metricsRes.text();
        // Count monitor_status lines in Prometheus metrics
        const matches = text.match(/^monitor_status\{/gm);
        monitorCount = matches?.length ?? 0;
      }
    } catch {
      // Metrics endpoint may not be enabled — that's fine
    }

    return {
      connected: true,
      url: kumaUrl,
      monitorCount,
      version: null,
      error: null,
    };
  } catch (err) {
    return {
      connected: false,
      url: kumaUrl,
      monitorCount: 0,
      version: null,
      error: err instanceof Error ? err.message : "Connection failed",
    };
  }
}

export const GET = withAuth(async () => {
  const status = await checkKumaConnection();
  return NextResponse.json({ data: status });
});

export const POST = withAuth(async () => {
  const status = await checkKumaConnection();
  return NextResponse.json({ data: status });
});
