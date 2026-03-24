/**
 * Next.js middleware for authentication gating and subdomain-based routing.
 *
 * **Auth gating** (when DOCKYARD_AUTH_ENABLED=true):
 * Checks for an Auth.js session cookie. If missing, redirects to /login.
 * Public paths (/login, /api/auth/*, static assets) are exempt.
 *
 * **Subdomain routing** (production):
 * Routes requests based on the Host header:
 * - dockyard.cc          → /(home)/...
 * - projects.dockyard.cc → /(projects)/projects/...
 * - watchtower.dockyard.cc → /(watchtower)/watchtower/...
 *
 * In local development (localhost), path-based routing works as-is.
 * API routes (/api/*) are never rewritten — they're shared across subdomains.
 */

import { NextRequest, NextResponse } from "next/server";

/**
 * The base domain for production subdomain routing.
 * Set via DOCKYARD_DOMAIN env var. Defaults to "dockyard.cc".
 */
const BASE_DOMAIN = process.env.DOCKYARD_DOMAIN ?? "dockyard.cc";

/** Whether the login system is active. */
const AUTH_ENABLED = process.env.DOCKYARD_AUTH_ENABLED === "true";

/** Paths that are accessible without authentication. */
const PUBLIC_PATHS = ["/login", "/api/auth"];

/** Subdomains that map to route groups. */
const SUBDOMAIN_MAP: Record<string, string> = {
  projects: "/projects",
  watchtower: "/watchtower",
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Never rewrite or gate API routes (except auth check below) or static assets
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // ── Auth gate ──────────────────────────────────────────────────
  if (AUTH_ENABLED) {
    const isPublicPath =
      PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
      pathname.startsWith("/api/");

    if (!isPublicPath) {
      // Check for Auth.js session cookie (dev vs prod cookie names)
      const sessionCookie =
        request.cookies.get("authjs.session-token") ??
        request.cookies.get("__Secure-authjs.session-token");

      if (!sessionCookie) {
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = "/login";
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  // ── Subdomain routing ──────────────────────────────────────────
  // Skip for API routes
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const host = request.headers.get("host") ?? "";

  // Skip subdomain logic on localhost — path-based routing handles it
  if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) {
    return NextResponse.next();
  }

  // Extract subdomain from host (e.g., "projects" from "projects.dockyard.cc")
  const subdomain = extractSubdomain(host, BASE_DOMAIN);

  if (subdomain && subdomain in SUBDOMAIN_MAP) {
    const prefix = SUBDOMAIN_MAP[subdomain];
    // Rewrite: projects.dockyard.cc/ → /projects
    // Rewrite: projects.dockyard.cc/my-project → /projects/my-project
    const rewritePath = pathname === "/" ? prefix : `${prefix}${pathname}`;
    const url = request.nextUrl.clone();
    url.pathname = rewritePath;
    return NextResponse.rewrite(url);
  }

  // Root domain or unknown subdomain — serve home routes
  return NextResponse.next();
}

/**
 * Extract the subdomain from a host header.
 * "projects.dockyard.cc" → "projects"
 * "dockyard.cc" → null
 * "projects.dockyard.cc:3000" → "projects"
 */
function extractSubdomain(host: string, baseDomain: string): string | null {
  // Strip port if present
  const hostWithoutPort = host.split(":")[0];

  // Check if host ends with the base domain
  if (!hostWithoutPort.endsWith(baseDomain)) {
    return null;
  }

  // Extract the part before the base domain
  const prefix = hostWithoutPort.slice(
    0,
    hostWithoutPort.length - baseDomain.length
  );

  // Remove trailing dot: "projects." → "projects"
  const subdomain = prefix.replace(/\.$/, "");

  return subdomain || null;
}

export const config = {
  matcher: [
    // Match all paths except static files and API routes
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
