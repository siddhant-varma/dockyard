/**
 * Server-Sent Events emitter for real-time dashboard updates.
 *
 * Manages a set of connected clients and broadcasts events.
 * Events: health.updated, alert.fired, deploy.status.
 */

type SSEClient = {
  id: string;
  controller: ReadableStreamDefaultController;
};

const clients = new Set<SSEClient>();

/** Add a client to the broadcast list. */
export function addClient(
  id: string,
  controller: ReadableStreamDefaultController
): void {
  clients.add({ id, controller });
}

/** Remove a client from the broadcast list. */
export function removeClient(id: string): void {
  for (const client of clients) {
    if (client.id === id) {
      clients.delete(client);
      break;
    }
  }
}

/** Broadcast an event to all connected SSE clients. */
export function broadcast(event: string, data: unknown): void {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const encoder = new TextEncoder();
  const encoded = encoder.encode(message);

  for (const client of clients) {
    try {
      client.controller.enqueue(encoded);
    } catch {
      clients.delete(client);
    }
  }
}

/** Get the number of connected clients. */
export function getClientCount(): number {
  return clients.size;
}
