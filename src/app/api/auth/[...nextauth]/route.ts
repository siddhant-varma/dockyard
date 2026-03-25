/**
 * NextAuth API route handler.
 *
 * Handles all auth-related HTTP requests: sign-in, sign-out, callbacks, session.
 * POST requests (sign-in attempts) are rate-limited to 5 attempts per 15 minutes
 * per IP address to protect against brute force attacks (OWASP ASVS v4).
 * GET requests (session checks) are not rate-limited.
 */

import { NextRequest, NextResponse } from "next/server";
import { handlers } from "@/lib/auth";
import { rateLimit } from "@/lib/auth/rate-limit";

export const GET = handlers.GET;

/** Rate limit: 5 sign-in attempts per 15 minutes per IP. */
const AUTH_RATE_LIMIT = 5;
const AUTH_RATE_WINDOW_MS = 15 * 60 * 1000;

/**
 * Rate-limited POST handler for auth endpoints.
 * Checks the IP-based rate limit before delegating to Auth.js.
 */
export async function POST(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded
    ? forwarded.split(",")[0].trim()
    : (request.headers.get("x-real-ip") ?? "unknown");

  const result = rateLimit(
    `${ip}:/api/auth`,
    AUTH_RATE_LIMIT,
    AUTH_RATE_WINDOW_MS
  );

  if (!result.allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(result.retryAfter ?? 60) },
      }
    );
  }

  return handlers.POST(request);
}
