/**
 * AES-256-GCM encryption/decryption for config values.
 *
 * All sensitive config entries (env vars, API keys) are encrypted
 * before storage in the Config_Entry table. The encryption key is
 * loaded from the CONFIG_ENCRYPTION_KEY environment variable.
 *
 * Format: base64(iv + ciphertext + authTag)
 * - IV: 12 bytes (random per encryption)
 * - Auth tag: 16 bytes (appended by GCM)
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const hex = process.env.CONFIG_ENCRYPTION_KEY;
  if (!hex || hex.length < 64) {
    throw new Error(
      "CONFIG_ENCRYPTION_KEY must be a 32-byte hex string (64 chars)"
    );
  }
  return Buffer.from(hex, "hex");
}

/**
 * Encrypt a plaintext string with AES-256-GCM.
 * Returns a base64 string containing IV + ciphertext + authTag.
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, encrypted, authTag]).toString("base64");
}

/**
 * Decrypt a base64 string produced by encrypt().
 * Returns the original plaintext.
 */
export function decrypt(encoded: string): string {
  const key = getKey();
  const data = Buffer.from(encoded, "base64");

  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(data.length - AUTH_TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH, data.length - AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}
