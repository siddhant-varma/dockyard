/**
 * Auth-aware fetch wrapper for client-side API calls.
 *
 * Intercepts 401 responses and redirects to the login page when the
 * session has expired or been revoked. Use this instead of raw `fetch()`
 * in client components that call authenticated API endpoints.
 *
 * When the API returns 401 with a "Session expired" message, the redirect
 * includes `?reason=timeout` so the login page can show an informative message.
 *
 * @example
 * ```ts
 * import { authFetch } from "@/lib/api/auth-fetch";
 * const res = await authFetch("/api/projects");
 * ```
 */

/**
 * Fetch wrapper that redirects to `/login` on 401 responses.
 * Detects session expiry from the response body and includes the
 * reason in the redirect URL (`?reason=timeout` or `?reason=revoked`).
 * Accepts the same arguments as the native `fetch()`.
 */
export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(input, init);

  if (res.status === 401) {
    const isAuthEnabled = process.env.NEXT_PUBLIC_AUTH_ENABLED === "true";
    if (isAuthEnabled && typeof window !== "undefined") {
      const currentPath = window.location.pathname;

      // Detect session expiry reason from the error message
      let reason = "";
      try {
        const body = await res.clone().json();
        const message = (body?.message ?? body?.error ?? "") as string;
        if (message.includes("revoked")) {
          reason = "&reason=revoked";
        } else if (message.includes("expired") || message.includes("timeout")) {
          reason = "&reason=timeout";
        }
      } catch {
        // Response not JSON — treat as generic 401
      }

      window.location.href = `/login?callbackUrl=${encodeURIComponent(currentPath)}${reason}`;
    }
  }

  return res;
}
