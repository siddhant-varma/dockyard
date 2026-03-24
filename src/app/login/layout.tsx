/**
 * Login layout — renders children without the main app shell (no sidebar, no header).
 * The login page is a full-screen centered form.
 */

import { SessionProvider } from "@/components/auth/session-provider";

export const metadata = {
  title: "Sign In",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionProvider>{children}</SessionProvider>;
}
