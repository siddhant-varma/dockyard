/**
 * SSE notification helper for Inngest background functions.
 *
 * Inngest functions run in a separate execution context and cannot
 * share the in-memory SSE client set. This helper fires a POST to
 * the internal /api/sse/broadcast endpoint to trigger broadcasts.
 *
 * Failures are swallowed — SSE notifications are best-effort
 * and should never block the main job.
 */

const BROADCAST_URL =
  process.env.AUTH_URL ?? "http://localhost:3000";

/**
 * Notify all connected SSE clients of an event.
 * Fire-and-forget — errors are logged but never thrown.
 */
export async function notifySSE(
  event: string,
  data: unknown
): Promise<void> {
  try {
    await fetch(`${BROADCAST_URL}/api/sse/broadcast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, data }),
    });
  } catch (err) {
    // Best-effort: log but don't fail the Inngest job
    console.error("[SSE notify] Failed to broadcast:", err);
  }
}
