/**
 * Tests for AES-256-GCM encryption/decryption.
 *
 * Verifies encrypt/decrypt roundtrips, uniqueness of ciphertexts,
 * and proper error handling for invalid keys.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { randomBytes } from "crypto";

// No DB mock needed — crypto module does not import DB connection.

describe("AES-256-GCM encrypt/decrypt", () => {
  const VALID_KEY = randomBytes(32).toString("hex"); // 64 hex chars = 32 bytes

  beforeEach(() => {
    process.env.CONFIG_ENCRYPTION_KEY = VALID_KEY;
  });

  afterEach(() => {
    delete process.env.CONFIG_ENCRYPTION_KEY;
    vi.resetModules();
  });

  async function getModule() {
    // Re-import to pick up env changes
    return await import("./aes");
  }

  it("encrypt then decrypt returns the original plaintext", async () => {
    const { encrypt, decrypt } = await getModule();

    const plaintext = "my-secret-database-url";
    const ciphertext = encrypt(plaintext);
    const decrypted = decrypt(ciphertext);

    expect(decrypted).toBe(plaintext);
  });

  it("handles empty string plaintext", async () => {
    const { encrypt, decrypt } = await getModule();

    const ciphertext = encrypt("");
    const decrypted = decrypt(ciphertext);

    expect(decrypted).toBe("");
  });

  it("handles unicode and special characters", async () => {
    const { encrypt, decrypt } = await getModule();

    const plaintext = "password=p@$$w0rd!&key=日本語🔐";
    const ciphertext = encrypt(plaintext);
    const decrypted = decrypt(ciphertext);

    expect(decrypted).toBe(plaintext);
  });

  it("produces different ciphertexts for the same plaintext (random IV)", async () => {
    const { encrypt } = await getModule();

    const plaintext = "same-value-twice";
    const cipher1 = encrypt(plaintext);
    const cipher2 = encrypt(plaintext);

    expect(cipher1).not.toBe(cipher2);
  });

  it("produces different ciphertexts for different plaintexts", async () => {
    const { encrypt } = await getModule();

    const cipher1 = encrypt("value-one");
    const cipher2 = encrypt("value-two");

    expect(cipher1).not.toBe(cipher2);
  });

  it("throws when CONFIG_ENCRYPTION_KEY is missing", async () => {
    delete process.env.CONFIG_ENCRYPTION_KEY;
    const { encrypt } = await getModule();

    expect(() => encrypt("test")).toThrow("CONFIG_ENCRYPTION_KEY");
  });

  it("throws when CONFIG_ENCRYPTION_KEY is too short", async () => {
    process.env.CONFIG_ENCRYPTION_KEY = "abcdef"; // only 6 chars, need 64
    const { encrypt } = await getModule();

    expect(() => encrypt("test")).toThrow("CONFIG_ENCRYPTION_KEY");
  });

  it("decrypt fails with a different key", async () => {
    const { encrypt } = await getModule();
    const ciphertext = encrypt("secret-data");

    // Change the key
    process.env.CONFIG_ENCRYPTION_KEY = randomBytes(32).toString("hex");
    const freshModule = await getModule();

    expect(() => freshModule.decrypt(ciphertext)).toThrow();
  });

  it("decrypt fails with corrupted ciphertext", async () => {
    const { encrypt, decrypt } = await getModule();
    const ciphertext = encrypt("important-data");

    // Corrupt the middle of the base64 string
    const corrupted =
      ciphertext.slice(0, 10) + "XXXX" + ciphertext.slice(14);

    expect(() => decrypt(corrupted)).toThrow();
  });

  it("handles long plaintexts (multi-block encryption)", async () => {
    const { encrypt, decrypt } = await getModule();

    const longPlaintext = "A".repeat(10000);
    const ciphertext = encrypt(longPlaintext);
    const decrypted = decrypt(ciphertext);

    expect(decrypted).toBe(longPlaintext);
  });
});
