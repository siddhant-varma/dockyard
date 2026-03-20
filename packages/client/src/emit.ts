/**
 * CloudEvents emission client for DockYard DIP Level 3.
 *
 * Sends typed events to DockYard's /api/ingest endpoint with
 * Standard Webhooks signature verification.
 */

import { createHmac, randomUUID } from "crypto";

/** Known DockYard event types. */
export type DockYardEventType =
  | "deployment.started"
  | "deployment.completed"
  | "deployment.failed"
  | "error.spike"
  | "performance.degraded"
  | "config.changed"
  | "test.completed"
  | "milestone.reached";

/** Configuration for the event emitter. */
export interface EmitConfig {
  endpoint: string;
  projectId: string;
  webhookSecret: string;
}

/**
 * Create a CloudEvents emitter for DockYard.
 *
 * @param config - Emitter configuration
 * @returns emit function
 */
export function createEmitter(config: EmitConfig) {
  /**
   * Send a CloudEvent to DockYard.
   *
   * @param type - Event type
   * @param data - Event data payload
   */
  async function emit(
    type: DockYardEventType,
    data: Record<string, unknown>
  ): Promise<void> {
    const event = {
      specversion: "1.0",
      id: randomUUID(),
      source: `dockyard://projects/${config.projectId}`,
      type: `cc.dockyard.${type}`,
      time: new Date().toISOString(),
      datacontenttype: "application/json",
      data,
    };

    const body = JSON.stringify(event);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const msgId = event.id;
    const toSign = `${msgId}.${timestamp}.${body}`;
    const signature = createHmac("sha256", config.webhookSecret)
      .update(toSign)
      .digest("base64");

    const url = `${config.endpoint}/api/ingest`;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/cloudevents+json",
            "X-DIP-Version": "1.0",
            "webhook-id": msgId,
            "webhook-timestamp": timestamp,
            "webhook-signature": `v1,${signature}`,
          },
          body,
        });

        if (res.ok || res.status === 202) return;
        if (res.status >= 400 && res.status < 500) return;
      } catch {
        if (attempt === 2) throw new Error(`Failed to emit event after 3 attempts`);
      }

      await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
    }
  }

  return { emit };
}
