/**
 * AES-256-GCM encryption check — encrypt/decrypt round-trip.
 * @module health/checks/encryption
 */

import { encrypt, decrypt } from "@/lib/crypto/aes";
import { type DeepCheckResult, elapsed } from "./types";

/** Check encryption by performing an encrypt/decrypt round-trip. */
export async function checkEncryption(): Promise<DeepCheckResult> {
  const start = performance.now();
  const key = process.env.CONFIG_ENCRYPTION_KEY;

  if (!key) {
    return {
      slug: "encryption",
      name: "Encryption",
      status: "ok",
      critical: false,
      latencyMs: elapsed(start),
      error: "CONFIG_ENCRYPTION_KEY not configured (optional)",
    };
  }

  try {
    const testValue = "dockyard-deep-health-check";
    const encrypted = encrypt(testValue);
    const decrypted = decrypt(encrypted);

    if (decrypted !== testValue) {
      return {
        slug: "encryption",
        name: "Encryption",
        status: "error",
        critical: true,
        latencyMs: elapsed(start),
        error: "Round-trip mismatch — decrypted value differs from original",
      };
    }

    return {
      slug: "encryption",
      name: "Encryption",
      status: "ok",
      critical: true,
      latencyMs: elapsed(start),
    };
  } catch (err) {
    return {
      slug: "encryption",
      name: "Encryption",
      status: "error",
      critical: true,
      latencyMs: elapsed(start),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
