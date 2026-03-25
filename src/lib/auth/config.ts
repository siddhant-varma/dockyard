/**
 * Auth.js (NextAuth v5) configuration for DockYard.
 *
 * Supports two authentication providers:
 * 1. **Credentials** — Admin login with DOCKYARD_ADMIN_USER / DOCKYARD_ADMIN_PASSWORD env vars.
 *    Returns a synthetic superadmin user without touching the database.
 * 2. **GitHub OAuth** — Standard OAuth flow, persists users via the Drizzle adapter.
 *    Only active when AUTH_GITHUB_ID is configured.
 *
 * Sessions use JWT strategy (stateless — no session table needed).
 * JWT tokens enforce dual timeout: idle (default 30 min) and absolute (default 8h).
 *
 * Environment variables required:
 * - AUTH_SECRET: Random secret for signing tokens
 * - DOCKYARD_ADMIN_USER: Admin email/username for Credentials login
 * - DOCKYARD_ADMIN_PASSWORD: Admin password for Credentials login
 * - AUTH_GITHUB_ID (optional): GitHub OAuth App client ID
 * - AUTH_GITHUB_SECRET (optional): GitHub OAuth App client secret
 * - DOCKYARD_SESSION_IDLE_TIMEOUT (optional): Idle timeout in seconds (default: 1800)
 * - DOCKYARD_SESSION_ABSOLUTE_TIMEOUT (optional): Absolute timeout in seconds (default: 28800)
 */

import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db/connection";
import {
  users,
  accounts,
  verificationTokens,
  mfaCredentials,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  platformSettings,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { logAudit } from "./audit";
import { isSessionRevoked } from "./session-revocation";

/** Synthetic user ID for the credentials-based admin. */
const CREDENTIALS_ADMIN_ID = "credentials-admin";

/**
 * Idle timeout in seconds. After this much inactivity, the session expires.
 * Default: 1800 (30 minutes). Configurable via DOCKYARD_SESSION_IDLE_TIMEOUT.
 */
const IDLE_TIMEOUT = parseInt(
  process.env.DOCKYARD_SESSION_IDLE_TIMEOUT ?? "1800",
  10
);

/**
 * Absolute timeout in seconds. Session expires this long after initial sign-in,
 * regardless of activity. Default: 28800 (8 hours).
 * Configurable via DOCKYARD_SESSION_ABSOLUTE_TIMEOUT.
 */
const ABSOLUTE_TIMEOUT = parseInt(
  process.env.DOCKYARD_SESSION_ABSOLUTE_TIMEOUT ?? "28800",
  10
);

/** Whether the auth system is active (timeout enforcement is skipped when disabled). */
const AUTH_ENABLED = process.env.DOCKYARD_AUTH_ENABLED === "true";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Credentials({
      name: "Admin Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        // Support both env var names (DOCKYARD_ADMIN_* preferred, SUPERADMIN_* as fallback)
        const adminUser =
          process.env.DOCKYARD_ADMIN_USER ??
          process.env.SUPERADMIN_EMAIL ??
          "admin";
        const adminPass =
          process.env.DOCKYARD_ADMIN_PASSWORD ??
          process.env.SUPERADMIN_PASSWORD;

        if (!adminPass) return null;

        if (email !== adminUser || password !== adminPass) {
          // Audit failed login attempt (non-blocking)
          logAudit({
            actorId: "anonymous",
            action: "auth.login_failed",
            targetType: "session",
            diff: { attemptedEmail: email },
          }).catch(() => {});
          return null;
        }

        return {
          id: CREDENTIALS_ADMIN_ID,
          name: "Admin",
          email: adminUser,
          role: "superadmin",
        };
      },
    }),
    GitHub,
  ],
  session: {
    strategy: "jwt",
    maxAge: ABSOLUTE_TIMEOUT,
    updateAge: 300, // Rotate cookie every 5 minutes of activity
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Initial sign-in: record timestamps for timeout tracking
        const now = Math.floor(Date.now() / 1000);
        token.issuedAt = now;
        token.lastActivity = now;

        // Credentials provider: user.role is set directly (no DB lookup needed)
        if ((user as Record<string, unknown>).role) {
          token.role = (user as Record<string, unknown>).role as string;
          token.userId = user.id;
        } else if (user.id) {
          // GitHub OAuth: look up role from DB
          const dbUser = await db.query.users.findFirst({
            where: eq(users.id, user.id),
          });
          if (dbUser) {
            token.role = dbUser.role;
            token.userId = dbUser.id;
          }
        }

        // Check if MFA verification is required (server mode only)
        if (process.env.DOCKYARD_MODE === "server" && token.userId) {
          try {
            const settings = await db.query.platformSettings.findFirst();
            const s = settings?.settings as Record<string, unknown> | null;
            if (s?.mfaEnforced === true) {
              // Check if this user has a TOTP credential
              const hasMfa = await db
                .select({ id: mfaCredentials.id })
                .from(mfaCredentials)
                .where(eq(mfaCredentials.userId, token.userId as string))
                .limit(1);
              if (hasMfa.length > 0) {
                token.mfaPending = true;
              }
            }
          } catch {
            // Fail open — don't block login if MFA check fails
          }
        }

        return token;
      }

      // Subsequent calls: enforce timeouts (only when auth is enabled)
      if (AUTH_ENABLED && token.issuedAt) {
        const now = Math.floor(Date.now() / 1000);

        // Absolute timeout: force re-login after max session duration.
        // Skip if issuedAt is missing (old token from before timeout feature).
        if (
          token.issuedAt &&
          now - (token.issuedAt as number) > ABSOLUTE_TIMEOUT
        ) {
          token.expired = true;
          token.expiredReason = "absolute";
          return token;
        }

        // Idle timeout: force re-login after inactivity.
        // If lastActivity is missing (old token from before timeout feature),
        // initialize it to now instead of expiring immediately.
        if (!token.lastActivity) {
          token.lastActivity = now;
        } else if (now - (token.lastActivity as number) > IDLE_TIMEOUT) {
          token.expired = true;
          token.expiredReason = "idle";
          return token;
        }

        // Session revocation check (uses in-memory cache, ~0ms when cached)
        if (token.userId && token.issuedAt) {
          const revoked = await isSessionRevoked(
            token.userId as string,
            token.issuedAt as number
          );
          if (revoked) {
            token.expired = true;
            token.expiredReason = "revoked";
            return token;
          }
        }

        // Sliding window: update last activity timestamp
        token.lastActivity = now;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.role = token.role as string;
      }

      // Propagate MFA pending state to the client session
      if (token.mfaPending) {
        session.mfaPending = true;
      }

      // Propagate expiry state to the client session
      if (token.expired) {
        session.expired = true;
        session.expiredReason = token.expiredReason as
          | "idle"
          | "absolute"
          | "revoked"
          | undefined;
      }

      return session;
    },
  },
  events: {
    async signIn({ user }) {
      // Audit successful login (non-blocking)
      logAudit({
        actorId: user.id ?? "unknown",
        action: "auth.login_success",
        targetType: "session",
        targetId: user.id ?? undefined,
        diff: { email: user.email },
      }).catch(() => {});
    },
    async createUser({ user }) {
      // Auto-promote the first user to superadmin (GitHub OAuth only)
      const userCount = await db.$count(users);
      if (userCount === 1 && user.id) {
        await db
          .update(users)
          .set({ role: "superadmin" })
          .where(eq(users.id, user.id));
      }
    },
  },
});
