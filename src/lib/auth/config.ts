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
 *
 * Environment variables required:
 * - AUTH_SECRET: Random secret for signing tokens
 * - DOCKYARD_ADMIN_USER: Admin email/username for Credentials login
 * - DOCKYARD_ADMIN_PASSWORD: Admin password for Credentials login
 * - AUTH_GITHUB_ID (optional): GitHub OAuth App client ID
 * - AUTH_GITHUB_SECRET (optional): GitHub OAuth App client secret
 */

import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db/connection";
import { users, accounts, verificationTokens } from "@/db/schema";
import { eq } from "drizzle-orm";

/** Synthetic user ID for the credentials-based admin. */
const CREDENTIALS_ADMIN_ID = "credentials-admin";

export const { handlers, auth, signIn, signOut } = NextAuth({
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

        const adminUser = process.env.DOCKYARD_ADMIN_USER ?? "admin";
        const adminPass = process.env.DOCKYARD_ADMIN_PASSWORD;

        if (!adminPass) return null;
        if (email !== adminUser || password !== adminPass) return null;

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
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
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
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  events: {
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
