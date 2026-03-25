/**
 * Session revocation service for DockYard.
 *
 * Provides server-side session invalidation for JWT-based auth.
 * Since JWTs are stateless and cannot be individually revoked,
 * this service maintains a `revoked_sessions` table. The JWT callback
 * checks this table (with an in-memory TTL cache) on each request.
 *
 * Revocation scenarios:
 * - **Admin force-logout**: Revokes all sessions via the Settings UI
 * - **Password change**: Revokes user-specific sessions
 * - **Suspicious activity**: Revokes user-specific sessions
 *
 * The special userId `"*"` denotes a global revocation — all sessions
 * issued before that timestamp are invalidated.
 *
 * @module session-revocation
 */

import { db } from "@/db/connection";
import { revokedSessions } from "@/db/schema";
import { and, eq, gte, or } from "drizzle-orm";

/** Valid reasons for revoking a session. */
export type RevocationReason =
  | "admin_force_logout"
  | "password_change"
  | "suspicious_activity";

/** Wildcard user ID that matches all users (global revocation). */
const WILDCARD_USER = "*";

// ── In-memory TTL cache ────────────────────────────────────────
// Avoids hitting the DB on every single JWT callback invocation.
// Cache entries expire after CACHE_TTL_MS milliseconds.

const CACHE_TTL_MS = 30_000; // 30 seconds

interface CacheEntry {
  revoked: boolean;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

/** Build a cache key from userId and issuedAt. */
function cacheKey(userId: string, issuedAt: number): string {
  return `${userId}:${issuedAt}`;
}

/**
 * Revoke all sessions for a specific user.
 *
 * Any JWT issued before this revocation's timestamp will be rejected
 * on the next request when the JWT callback runs.
 *
 * @param userId - The user ID whose sessions to revoke
 * @param reason - Why the sessions are being revoked
 */
export async function revokeUserSessions(
  userId: string,
  reason: RevocationReason
): Promise<void> {
  await db.insert(revokedSessions).values({ userId, reason });
  // Invalidate cache for this user
  invalidateCacheForUser(userId);
}

/**
 * Revoke all sessions for all users (global force-logout).
 *
 * Inserts a wildcard (`"*"`) entry. The JWT callback checks both
 * user-specific and wildcard revocations.
 *
 * @param reason - Why all sessions are being revoked
 */
export async function revokeAllSessions(
  reason: RevocationReason
): Promise<void> {
  await db.insert(revokedSessions).values({ userId: WILDCARD_USER, reason });
  // Clear entire cache since all sessions are affected
  cache.clear();
}

/**
 * Check whether a user's session has been revoked.
 *
 * Looks for revocation entries (user-specific or wildcard) with a
 * `revokedAt` timestamp after the token's `issuedAt`. Uses an
 * in-memory cache (30s TTL) to minimize database queries.
 *
 * @param userId - The user ID from the JWT token
 * @param issuedAt - Unix timestamp (seconds) when the JWT was issued
 * @returns `true` if the session has been revoked
 */
export async function isSessionRevoked(
  userId: string,
  issuedAt: number
): Promise<boolean> {
  const key = cacheKey(userId, issuedAt);
  const now = Date.now();

  // Check cache first
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.revoked;
  }

  // Query DB: find any revocation for this user (or wildcard) after issuedAt
  const issuedAtDate = new Date(issuedAt * 1000);
  const revocations = await db
    .select({ id: revokedSessions.id })
    .from(revokedSessions)
    .where(
      and(
        or(
          eq(revokedSessions.userId, userId),
          eq(revokedSessions.userId, WILDCARD_USER)
        ),
        gte(revokedSessions.revokedAt, issuedAtDate)
      )
    )
    .limit(1);

  const revoked = revocations.length > 0;

  // Cache the result
  cache.set(key, { revoked, expiresAt: now + CACHE_TTL_MS });

  return revoked;
}

/** Remove all cache entries for a specific user. */
function invalidateCacheForUser(userId: string): void {
  for (const [key] of cache) {
    if (key.startsWith(`${userId}:`)) {
      cache.delete(key);
    }
  }
}
