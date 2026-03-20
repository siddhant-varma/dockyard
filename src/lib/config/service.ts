/**
 * Config management service.
 *
 * Handles encrypted config entry CRUD, audit logging, and
 * synchronization with the Dokploy deployment platform.
 *
 * Config values are AES-256-GCM encrypted at rest. The encryption key
 * comes from the CONFIG_ENCRYPTION_KEY environment variable.
 *
 * The "apply config" flow:
 * 1. Build full env string from all config entries
 * 2. Call Dokploy saveEnvironment (requires FULL env string)
 * 3. Call Dokploy redeploy (separate API call)
 * 4. Track deploy status via Inngest
 */

import { and, eq } from "drizzle-orm";
import { db } from "@/db/connection";
import { configEntries, configAuditLog } from "@/db/schema";
import { encrypt, decrypt } from "@/lib/crypto/aes";
import { createHash } from "crypto";

/** Decrypted config entry for API/UI consumption. */
export interface ConfigEntryView {
  id: string;
  key: string;
  value: string;
  environment: string;
  isSecret: boolean;
  category: string | null;
  displayName: string | null;
  description: string | null;
  inputType: string;
  inputOptions: unknown;
}

/**
 * Get all config entries for a project, decrypting values.
 */
export async function getConfigEntries(
  projectId: string
): Promise<ConfigEntryView[]> {
  const entries = await db.query.configEntries.findMany({
    where: eq(configEntries.projectId, projectId),
    orderBy: (e, { asc }) => [asc(e.category), asc(e.key)],
  });

  return entries.map((e) => ({
    id: e.id,
    key: e.key,
    value: e.valueEncrypted ? decrypt(e.valueEncrypted) : "",
    environment: e.environment,
    isSecret: e.isSecret,
    category: e.category,
    displayName: e.displayName,
    description: e.description,
    inputType: e.inputType,
    inputOptions: e.inputOptions,
  }));
}

/**
 * Create or update a config entry. Encrypts the value and writes an audit log.
 */
export async function upsertConfigEntry(
  projectId: string,
  key: string,
  value: string,
  options: {
    isSecret?: boolean;
    category?: string;
    displayName?: string;
    description?: string;
    inputType?: string;
    inputOptions?: unknown;
    changedBy?: string;
    changeReason?: string;
  } = {}
): Promise<void> {
  const encrypted = encrypt(value);
  const newHash = hashValue(value);

  const existing = await db.query.configEntries.findFirst({
    where: and(
      eq(configEntries.projectId, projectId),
      eq(configEntries.key, key)
    ),
  });

  if (existing) {
    const oldHash = existing.valueEncrypted
      ? hashValue(decrypt(existing.valueEncrypted))
      : null;

    await db
      .update(configEntries)
      .set({
        valueEncrypted: encrypted,
        isSecret: options.isSecret ?? existing.isSecret,
        category: options.category ?? existing.category,
        displayName: options.displayName ?? existing.displayName,
        description: options.description ?? existing.description,
        inputType: options.inputType ?? existing.inputType,
        inputOptions: options.inputOptions ?? existing.inputOptions,
        updatedBy: options.changedBy,
        updatedAt: new Date(),
      })
      .where(eq(configEntries.id, existing.id));

    await db.insert(configAuditLog).values({
      configEntryId: existing.id,
      projectId,
      oldValueHash: oldHash,
      newValueHash: newHash,
      changedBy: options.changedBy,
      changeReason: options.changeReason,
    });
  } else {
    const [created] = await db
      .insert(configEntries)
      .values({
        projectId,
        key,
        valueEncrypted: encrypted,
        isSecret: options.isSecret ?? false,
        category: options.category,
        displayName: options.displayName,
        description: options.description,
        inputType: options.inputType ?? "text",
        inputOptions: options.inputOptions,
        updatedBy: options.changedBy,
      })
      .returning();

    await db.insert(configAuditLog).values({
      configEntryId: created.id,
      projectId,
      oldValueHash: null,
      newValueHash: newHash,
      changedBy: options.changedBy,
      changeReason: options.changeReason ?? "Initial creation",
    });
  }
}

/**
 * Build the full environment string for Dokploy from all config entries.
 * Format: KEY=value\nKEY2=value2\n...
 */
export async function buildEnvString(projectId: string): Promise<string> {
  const entries = await getConfigEntries(projectId);
  return entries.map((e) => `${e.key}=${e.value}`).join("\n");
}

/**
 * Delete a config entry.
 */
export async function deleteConfigEntry(entryId: string): Promise<void> {
  await db.delete(configEntries).where(eq(configEntries.id, entryId));
}

/** SHA-256 hash of a value (for audit log — never store plaintext). */
function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
