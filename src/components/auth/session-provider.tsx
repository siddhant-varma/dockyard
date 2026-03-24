/**
 * Client-side SessionProvider wrapper for next-auth.
 *
 * Wraps the NextAuth SessionProvider so it can be used in server component
 * layouts (which can't use "use client" directives directly).
 *
 * Usage in a layout:
 * ```tsx
 * import { SessionProvider } from "@/components/auth/session-provider";
 * <SessionProvider>{children}</SessionProvider>
 * ```
 */

"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
