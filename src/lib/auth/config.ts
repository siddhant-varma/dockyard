/**
 * Auth.js (NextAuth v5) configuration for DockYard.
 *
 * Uses GitHub OAuth for authentication and the Drizzle adapter
 * to persist user accounts in PostgreSQL. Sessions use JWT strategy
 * (stateless — no session table needed).
 *
 * Environment variables required:
 * - AUTH_SECRET: Random secret for signing tokens
 * - AUTH_GITHUB_ID: GitHub OAuth App client ID
 * - AUTH_GITHUB_SECRET: GitHub OAuth App client secret
 */

import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db/connection";
import { users, accounts, verificationTokens } from "@/db/schema";
import { eq } from "drizzle-orm";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    verificationTokensTable: verificationTokens,
  }),
  providers: [GitHub],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        // First sign-in: attach role from DB
        const dbUser = await db.query.users.findFirst({
          where: eq(users.id, user.id),
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.userId = dbUser.id;
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
      // Auto-promote the first user to superadmin
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
