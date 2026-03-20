/**
 * Integration test: CloudEvents ingestion.
 */

import { describe, it, expect } from "vitest";

describe("CloudEvents Ingestion", () => {
  it("should export parseCloudEvent", async () => {
    const { parseCloudEvent } = await import("@/lib/ingestion/cloudevents");
    expect(typeof parseCloudEvent).toBe("function");
  });

  it("should export verifyWebhookSignature", async () => {
    const { verifyWebhookSignature } = await import("@/lib/ingestion/webhook-verify");
    expect(typeof verifyWebhookSignature).toBe("function");
  });

  it("should verify a valid webhook signature", async () => {
    const { verifyWebhookSignature } = await import("@/lib/ingestion/webhook-verify");
    const { createHmac } = await import("crypto");

    const secret = "test-secret";
    const msgId = "msg_123";
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const body = '{"test":true}';
    const toSign = `${msgId}.${timestamp}.${body}`;
    const signature = createHmac("sha256", secret).update(toSign).digest("base64");

    const result = verifyWebhookSignature(body, `v1,${signature}`, secret, timestamp, msgId);
    expect(result.valid).toBe(true);
  });

  it("should reject an invalid signature", async () => {
    const { verifyWebhookSignature } = await import("@/lib/ingestion/webhook-verify");
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const result = verifyWebhookSignature('{"test":true}', "v1,invalid", "secret", timestamp);
    expect(result.valid).toBe(false);
  });
});
