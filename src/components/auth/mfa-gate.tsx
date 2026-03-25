/**
 * MFA gate — client component that checks if TOTP verification is pending.
 *
 * Rendered in the root layout. After login, if the session has mfaPending=true,
 * sets an mfa-enforced cookie and redirects to /login/verify.
 * This works with the middleware: middleware checks mfa-enforced + mfa-verified
 * cookies to gate access. The verify page clears the pending state.
 */

"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function MfaGate() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const mfaPending = (session as Record<string, unknown> | null)?.mfaPending;

  useEffect(() => {
    // Skip on login/verify pages and API routes
    if (pathname?.startsWith("/login")) return;
    if (pathname?.startsWith("/api")) return;

    if (mfaPending) {
      // Set cookie so middleware can enforce on subsequent requests
      document.cookie =
        "mfa-enforced=true; path=/; max-age=28800; samesite=lax";
      // Redirect to verify page
      window.location.href = `/login/verify?callbackUrl=${encodeURIComponent(pathname ?? "/")}`;
    }
  }, [mfaPending, pathname]);

  return null;
}
