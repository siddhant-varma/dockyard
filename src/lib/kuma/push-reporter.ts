/**
 * Kuma push reporter — sends DockYard's own health status to an
 * Uptime Kuma push monitor.
 *
 * Replaces the internal health-check Inngest function for self-monitoring
 * when Kuma is configured. Instead of polling DockYard from Kuma (pull),
 * DockYard pushes its status to Kuma's push monitor endpoint on a schedule.
 *
 * Push monitors in Kuma work by expecting periodic HTTP requests to a
 * unique URL. If no request arrives within the configured interval,
 * Kuma marks the monitor as down.
 *
 * @module kuma/push-reporter
 */

import { isKumaConfigured } from "./adapter";

/** Push reporter result. */
interface PushResult {
  /** Whether the push was successful. */
  success: boolean;
  /** HTTP status code from Kuma (or 0 if network error). */
  statusCode: number;
  /** Error message if the push failed. */
  error?: string;
  /** Duration of the push request in milliseconds. */
  durationMs: number;
}

/**
 * Report DockYard's health status to an Uptime Kuma push monitor.
 *
 * Sends an HTTP GET request to the push monitor URL, which tells Kuma
 * that DockYard is alive. If this request stops arriving, Kuma marks
 * DockYard as down and triggers notifications.
 *
 * @param pushToken - The push monitor's unique token (from the Kuma push URL)
 * @param status - Current health status: "up", "down", or "pending"
 * @param msg - Optional status message (e.g., "All 5 components healthy")
 * @param ping - Optional response time in milliseconds
 * @returns Result of the push attempt
 */
export async function reportHealthToKuma(
  pushToken: string,
  status: "up" | "down" | "pending" = "up",
  msg?: string,
  ping?: number
): Promise<PushResult> {
  if (!isKumaConfigured()) {
    return {
      success: false,
      statusCode: 0,
      error: "Kuma is not configured",
      durationMs: 0,
    };
  }

  const kumaUrl = process.env.KUMA_URL ?? "";
  const pushUrl = new URL(`/api/push/${pushToken}`, kumaUrl);
  pushUrl.searchParams.set("status", status);
  if (msg) pushUrl.searchParams.set("msg", msg);
  if (ping != null) pushUrl.searchParams.set("ping", String(ping));

  const start = performance.now();

  try {
    const res = await fetch(pushUrl.toString(), {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });

    const durationMs = Math.round(performance.now() - start);

    return {
      success: res.ok,
      statusCode: res.status,
      error: res.ok ? undefined : `HTTP ${res.status} ${res.statusText}`,
      durationMs,
    };
  } catch (err) {
    const durationMs = Math.round(performance.now() - start);
    const message = err instanceof Error ? err.message : String(err);

    return {
      success: false,
      statusCode: 0,
      error: message.includes("abort") ? "Timeout (5s)" : message,
      durationMs,
    };
  }
}

/**
 * Run a self-check of DockYard's key components and report the result
 * to Kuma via the push monitor.
 *
 * Checks:
 * 1. API is responding (implicit — if this code runs, the API is up)
 * 2. Constructs a status message with component summary
 *
 * @param pushToken - The push monitor token
 * @param componentStatuses - Map of component name to healthy/unhealthy
 * @returns Push result
 */
export async function reportSelfHealthToKuma(
  pushToken: string,
  componentStatuses: Record<string, boolean>
): Promise<PushResult> {
  const entries = Object.entries(componentStatuses);
  const healthyCount = entries.filter(([, ok]) => ok).length;
  const totalCount = entries.length;
  const allHealthy = healthyCount === totalCount;

  const status = allHealthy ? "up" : "down";
  const msg = `${healthyCount}/${totalCount} components healthy`;

  return reportHealthToKuma(pushToken, status, msg);
}
