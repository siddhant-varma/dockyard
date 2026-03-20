/**
 * Server component wrapper that checks authentication.
 * Redirects unauthenticated users to the login page.
 *
 * @example
 * ```tsx
 * // In a layout:
 * export default async function Layout({ children }) {
 *   return <AuthGuard>{children}</AuthGuard>;
 * }
 * ```
 */

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAuthEnabled } from "@/lib/env";

interface AuthGuardProps {
  children: React.ReactNode;
}

export async function AuthGuard({ children }: AuthGuardProps) {
  if (!isAuthEnabled) {
    return <>{children}</>;
  }
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return <>{children}</>;
}
