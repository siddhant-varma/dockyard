import { addClient, removeClient } from "@/lib/sse/emitter";

/** GET /api/sse — Server-Sent Events stream for real-time updates. */
export async function GET() {
  const clientId = crypto.randomUUID();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      addClient(clientId, controller);

      // Send initial connection event
      controller.enqueue(
        encoder.encode(
          `event: connected\ndata: ${JSON.stringify({ clientId })}\n\n`
        )
      );

      // Keepalive every 30s to prevent proxy/CDN disconnects
      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(":keepalive\n\n"));
        } catch {
          clearInterval(keepalive);
        }
      }, 30_000);

      // Store interval ID for cleanup
      (controller as unknown as Record<string, unknown>).__keepalive =
        keepalive;
    },
    cancel(controller) {
      const ctrl = controller as unknown as Record<string, unknown>;
      if (ctrl?.__keepalive) {
        clearInterval(ctrl.__keepalive as NodeJS.Timeout);
      }
      removeClient(clientId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
