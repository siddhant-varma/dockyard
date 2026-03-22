/**
 * Standard Webhooks signature verification.
 *
 * Implements HMAC-SHA256 signature verification per the Standard Webhooks
 * specification. This is used to verify incoming webhook payloads from
 * DIP-integrated projects and other trusted sources.
 *
 * The Standard Webhooks spec requires:
 * 1. HMAC-SHA256 signature using shared secret
 * 2. Timestamp included in the signed content to prevent replay attacks
 * 3. Signature format: "v1,<base64-encoded-hmac>"
 * 4. Timestamp tolerance window (5 minutes) to reject stale/replayed events
 *
 * @see https://www.standardwebhooks.com/
 */

import { createHmac, timingSafeEqual } from "crypto";
import { createModuleLogger } from "@/lib/logger";
const log = createModuleLogger("ingestion.webhook-verify");

/** Maximum allowed age of a webhook timestamp (5 minutes in milliseconds). */
const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000;

/** Result of webhook signature verification. */
export interface VerificationResult {
  /** Whether the signature is valid. */
  valid: boolean;
  /** Reason for failure (only present when valid is false). */
  reason?: string;
}

/**
 * Verify a webhook payload signature using HMAC-SHA256 per the
 * Standard Webhooks specification.
 *
 * The signed content is constructed as: `${msgId}.${timestamp}.${body}`
 * where msgId is the webhook message ID, timestamp is the Unix epoch
 * seconds, and body is the raw request body.
 *
 * @param payload - Raw request body as a string
 * @param signature - Value of the webhook-signature header (format: "v1,<base64>")
 * @param secret - Shared webhook secret (may be base64-encoded with "whsec_" prefix)
 * @param timestamp - Value of the webhook-timestamp header (Unix epoch seconds)
 * @param msgId - Value of the webhook-id header (optional, defaults to empty string)
 * @returns Verification result indicating success or failure with reason
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  timestamp: string,
  msgId = ""
): VerificationResult {
  // Validate timestamp is present and numeric
  const tsSeconds = parseInt(timestamp, 10);
  if (isNaN(tsSeconds)) {
    log.warn({ msgId }, "Webhook verification failed — invalid timestamp");
    return { valid: false, reason: "Invalid timestamp: not a number" };
  }

  // Check timestamp is within tolerance window
  const timestampMs = tsSeconds * 1000;
  const now = Date.now();

  if (Math.abs(now - timestampMs) > TIMESTAMP_TOLERANCE_MS) {
    log.warn({ msgId, ageMs: Math.abs(now - timestampMs) }, "Webhook verification failed — timestamp outside tolerance");
    return {
      valid: false,
      reason: "Timestamp outside tolerance window (5 minutes)",
    };
  }

  // Parse signature — Standard Webhooks uses "v1,<base64>" format
  // Multiple signatures may be space-separated for key rotation
  const signatures = signature.split(" ");
  const v1Signatures = signatures
    .filter((s) => s.startsWith("v1,"))
    .map((s) => s.slice(3));

  if (v1Signatures.length === 0) {
    return { valid: false, reason: "No v1 signature found in header" };
  }

  // Decode secret — Standard Webhooks secrets may have "whsec_" prefix
  // and the rest is base64-encoded
  const secretBytes = decodeSecret(secret);

  // Construct the signed content per Standard Webhooks spec
  const signedContent = `${msgId}.${timestamp}.${payload}`;

  // Compute expected HMAC-SHA256
  const expectedHmac = createHmac("sha256", secretBytes)
    .update(signedContent)
    .digest("base64");

  // Check if any of the provided v1 signatures match (supports key rotation)
  for (const sig of v1Signatures) {
    try {
      const sigBuffer = Buffer.from(sig, "base64");
      const expectedBuffer = Buffer.from(expectedHmac, "base64");

      if (
        sigBuffer.length === expectedBuffer.length &&
        timingSafeEqual(sigBuffer, expectedBuffer)
      ) {
        log.info({ msgId }, "Webhook signature verified");
        return { valid: true };
      }
    } catch {
      // Buffer creation failed — try next signature
      continue;
    }
  }

  log.warn({ msgId }, "Webhook verification failed — signature mismatch");
  return { valid: false, reason: "Signature mismatch" };
}

/**
 * Decode a Standard Webhooks secret.
 *
 * Secrets may be plain strings or base64-encoded with a "whsec_" prefix.
 * The prefix convention allows webhook services to distinguish between
 * raw and encoded secrets.
 *
 * @param secret - Raw or encoded secret string
 * @returns Decoded secret as a Buffer
 */
function decodeSecret(secret: string): Buffer {
  if (secret.startsWith("whsec_")) {
    return Buffer.from(secret.slice(6), "base64");
  }
  return Buffer.from(secret, "utf-8");
}
