/**
 * Auth-aware fetch wrapper for client-side API calls.
 *
 * Intercepts 401 responses and redirects to the login page when the
 * session has expired. Use this instead of raw `fetch()` in client
 * components that call authenticated API endpoints.
 *
 * @example
 * ```ts
 * import { authFetch } from "@/lib/api/auth-fetch";
 * const res = await authFetch("/api/projects");
 * ```
 */

/**
 * Fetch wrapper that redirects to `/login` on 401 responses.
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
      window.location.href = `/login?callbackUrl=${encodeURIComponent(currentPath)}`;
    }
  }

  return res;
}
