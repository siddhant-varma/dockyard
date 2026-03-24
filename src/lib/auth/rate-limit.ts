/**
 * In-memory token-bucket rate limiter for API routes.
 *
 * Designed for single-instance VPS deployments (DockYard's primary target).
 * For multi-instance deployments, replace the in-memory Map with Redis
 * or a shared cache.
 *
 * @module rate-limit
 */

import { NextResponse } from "next/server";

/** State for a single rate-limit bucket. */
interface TokenBucket {
  /** Number of tokens currently available. */
  tokens: number;
  /** Timestamp (ms) when the bucket was last refilled. */
  lastRefill: number;
}

/** Result of a rate limit check. */
interface RateLimitResult {
  /** Whether the request is allowed. */
  allowed: boolean;
  /** Seconds until the client should retry (only set when denied). */
  retryAfter?: number;
}

/** Options for the withRateLimit middleware. */
interface RateLimitOptions {
  /** Maximum number of requests allowed per window. */
  limit: number;
  /** Time window in milliseconds. */
  windowMs: number;
}

/** In-memory storage for all rate-limit buckets, keyed by client identifier. */
const buckets = new Map<string, TokenBucket>();

/** Interval handle for the stale-entry cleanup timer. */
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

/** How often to sweep stale entries (60 seconds). */
const CLEANUP_INTERVAL_MS = 60_000;

/**
 * Start the background cleanup timer if not already running.
 * Removes buckets that haven't been touched in over 2x the longest
 * expected window to avoid unbounded memory growth.
 */
function ensureCleanupRunning(): void {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      // Remove entries idle for more than 5 minutes
      if (now - bucket.lastRefill > 5 * 60_000) {
        buckets.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);
  // Allow Node.js to exit even if the timer is running
  if (cleanupInterval && typeof cleanupInterval === "object" && "unref" in cleanupInterval) {
    cleanupInterval.unref();
  }
}

/**
 * Check whether a request identified by `key` is within the rate limit.
 *
 * Uses a token-bucket algorithm: each bucket starts with `limit` tokens and
 * refills to `limit` tokens every `windowMs` milliseconds. Each call
 * consumes one token. When no tokens remain, the request is denied.
 *
 * @param key - Unique identifier for the client (e.g., IP address or user ID).
 * @param limit - Maximum number of requests allowed per window.
 * @param windowMs - Time window in milliseconds.
 * @returns Whether the request is allowed, and a retry-after hint if not.
 *
 * @example
 * ```ts
 * const result = rateLimit("192.168.1.1:/api/config", 5, 60_000);
 * if (!result.allowed) {
 *   return new Response("Too many requests", { status: 429 });
 * }
 * ```
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  ensureCleanupRunning();

  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket) {
    bucket = { tokens: limit, lastRefill: now };
    buckets.set(key, bucket);
  }

  // Refill tokens if the window has elapsed
  const elapsed = now - bucket.lastRefill;
  if (elapsed >= windowMs) {
    bucket.tokens = limit;
    bucket.lastRefill = now;
  }

  if (bucket.tokens > 0) {
    bucket.tokens -= 1;
    return { allowed: true };
  }

  // Calculate how long until the bucket refills
  const retryAfterMs = windowMs - elapsed;
  const retryAfter = Math.ceil(retryAfterMs / 1000);

  return { allowed: false, retryAfter };
}

/**
 * Extract the client IP address from a request.
 *
 * Checks standard proxy headers (`x-forwarded-for`, `x-real-ip`) first,
 * then falls back to "unknown". In production behind a reverse proxy
 * (e.g., Traefik on Dokploy), the `x-forwarded-for` header is reliable.
 *
 * @param request - The incoming HTTP request.
 * @returns The client's IP address string.
 */
function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs; take the first (client)
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

/**
 * Higher-order function that wraps a Next.js API route handler with
 * IP-based rate limiting. Returns a 429 Too Many Requests response
 * with a `Retry-After` header when the limit is exceeded.
 *
 * Designed to compose with `withAuth`:
 * ```ts
 * export const POST = withAuth(
 *   withRateLimit(handler, { limit: 10, windowMs: 60_000 })
 * );
 * ```
 *
 * Or used standalone for public endpoints:
 * ```ts
 * export const POST = withRateLimit(handler, { limit: 100, windowMs: 60_000 });
 * ```
 *
 * @param handler - The route handler function to wrap.
 * @param options - Rate limit configuration (limit and window size).
 * @returns A wrapped handler that enforces rate limiting before delegation.
 */
export function withRateLimit<
  TArgs extends unknown[]
>(
  handler: (request: Request, ...args: TArgs) => Promise<NextResponse>,
  options: RateLimitOptions
): (request: Request, ...args: TArgs) => Promise<NextResponse> {
  return async (request: Request, ...args: TArgs): Promise<NextResponse> => {
    const ip = getClientIp(request);
    const url = new URL(request.url);
    const key = `${ip}:${url.pathname}`;

    const result = rateLimit(key, options.limit, options.windowMs);

    if (!result.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(result.retryAfter ?? 60),
          },
        }
      );
    }

    return handler(request, ...args);
  };
}
