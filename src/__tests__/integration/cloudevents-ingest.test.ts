/**
 * Integration test: CloudEvents ingestion.
 *
 * Tests: structured and binary content mode parsing, field validation,
 * webhook signature verification including replay protection.
 */

import { describe, it, expect } from "vitest";

describe("CloudEvents Ingestion", () => {
  // --- Original smoke tests ---

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

  // --- Behavior tests: CloudEvents parsing ---

  describe("parseCloudEvent — structured mode", () => {
    it("parses a valid structured CloudEvent", async () => {
      const { parseCloudEvent } = await import("@/lib/ingestion/cloudevents");

      const headers = { "content-type": "application/cloudevents+json" };
      const body = {
        specversion: "1.0",
        id: "evt-001",
        source: "/dockyard/test",
        type: "cc.dockyard.test.ping",
        time: "2026-03-22T10:00:00Z",
        data: { ping: true },
      };

      const result = parseCloudEvent(headers, body);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.event.id).toBe("evt-001");
        expect(result.event.source).toBe("/dockyard/test");
        expect(result.event.type).toBe("cc.dockyard.test.ping");
        expect(result.event.data).toEqual({ ping: true });
      }
    });

    it("rejects missing specversion", async () => {
      const { parseCloudEvent } = await import("@/lib/ingestion/cloudevents");

      const result = parseCloudEvent(
        { "content-type": "application/cloudevents+json" },
        { id: "e1", source: "/test", type: "test", time: "2026-03-22T10:00:00Z" }
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.field === "specversion")).toBe(true);
      }
    });

    it("rejects missing required fields (id, source, type, time)", async () => {
      const { parseCloudEvent } = await import("@/lib/ingestion/cloudevents");

      const result = parseCloudEvent(
        { "content-type": "application/cloudevents+json" },
        { specversion: "1.0" }
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const fields = result.errors.map((e) => e.field);
        expect(fields).toContain("id");
        expect(fields).toContain("source");
        expect(fields).toContain("type");
        expect(fields).toContain("time");
      }
    });

    it("rejects invalid time format", async () => {
      const { parseCloudEvent } = await import("@/lib/ingestion/cloudevents");

      const result = parseCloudEvent(
        { "content-type": "application/cloudevents+json" },
        {
          specversion: "1.0",
          id: "e1",
          source: "/test",
          type: "test",
          time: "not-a-date",
        }
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.some((e) => e.field === "time")).toBe(true);
      }
    });

    it("rejects non-object body in structured mode", async () => {
      const { parseCloudEvent } = await import("@/lib/ingestion/cloudevents");

      const result = parseCloudEvent(
        { "content-type": "application/cloudevents+json" },
        "not an object"
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors[0].field).toBe("body");
      }
    });
  });

  describe("parseCloudEvent — binary mode", () => {
    it("parses a valid binary-mode CloudEvent from ce-* headers", async () => {
      const { parseCloudEvent } = await import("@/lib/ingestion/cloudevents");

      const headers = {
        "content-type": "application/json",
        "ce-specversion": "1.0",
        "ce-id": "bin-001",
        "ce-source": "/binary/test",
        "ce-type": "cc.dockyard.deploy.completed",
        "ce-time": "2026-03-22T12:00:00Z",
      };
      const body = { deployId: "d-42" };

      const result = parseCloudEvent(headers, body);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.event.id).toBe("bin-001");
        expect(result.event.source).toBe("/binary/test");
        expect(result.event.data).toEqual({ deployId: "d-42" });
      }
    });

    it("rejects binary mode with missing ce-* headers", async () => {
      const { parseCloudEvent } = await import("@/lib/ingestion/cloudevents");

      const result = parseCloudEvent(
        { "content-type": "application/json" },
        { some: "data" }
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        // Should fail on specversion, id, source, type, time
        expect(result.errors.length).toBeGreaterThanOrEqual(4);
      }
    });
  });

  describe("verifyWebhookSignature — extended", () => {
    it("rejects a non-numeric timestamp", async () => {
      const { verifyWebhookSignature } = await import("@/lib/ingestion/webhook-verify");

      const result = verifyWebhookSignature("body", "v1,sig", "secret", "not-a-number");
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("Invalid timestamp");
    });

    it("rejects expired timestamp beyond 5-minute tolerance", async () => {
      const { verifyWebhookSignature } = await import("@/lib/ingestion/webhook-verify");

      const tenMinutesAgo = Math.floor((Date.now() - 10 * 60 * 1000) / 1000).toString();
      const result = verifyWebhookSignature("body", "v1,sig", "secret", tenMinutesAgo);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("tolerance");
    });

    it("rejects signature without v1 prefix", async () => {
      const { verifyWebhookSignature } = await import("@/lib/ingestion/webhook-verify");

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const result = verifyWebhookSignature("body", "v2,somesig", "secret", timestamp);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("No v1 signature");
    });
  });
});
