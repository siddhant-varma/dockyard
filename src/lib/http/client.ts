/**
 * Shared HTTP fetch wrapper for external API calls.
 *
 * Provides typed JSON fetching with:
 * - Timeout support (default 10s)
 * - Automatic retry with exponential backoff (429 rate limits)
 * - Structured error handling
 * - Rate limit header parsing
 *
 * Used by HetznerClient and DokployClient to call their respective APIs.
 */

import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("http.client");

/** Options for a fetch request. */
export interface FetchOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: unknown;
  /** Request timeout in milliseconds (default: 10000). */
  timeout?: number;
  /** Max retry attempts for 429/5xx errors (default: 3). */
  maxRetries?: number;
}

/** Structured HTTP error with status code and response body. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly body: unknown,
    public readonly url: string
  ) {
    super(`HTTP ${status} ${statusText} from ${url}`);
    this.name = "HttpError";
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }
}

/** Rate limit info parsed from response headers. */
export interface RateLimitInfo {
  limit: number | null;
  remaining: number | null;
  resetAt: Date | null;
}

/**
 * Fetch JSON from an external API with retries and error handling.
 *
 * @param url - Full URL to fetch
 * @param options - Request options
 * @returns Parsed JSON response body
 * @throws HttpError for non-2xx responses (after retries exhausted)
 */
export async function fetchJSON<T>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const {
    method = "GET",
    headers = {},
    body,
    timeout = 10000,
    maxRetries = 3,
  } = options;

  const requestInit: RequestInit = {
    method,
    headers: {
      Accept: "application/json",
      ...headers,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeout),
  };

  let lastError: Error | null = null;
  const urlPath = safeUrlPath(url);

  log.info({ method, url: urlPath }, "Outbound request start");
  log.debug({ method, url: urlPath, timeout, maxRetries, hasBody: !!body }, "Request details");

  const t0 = performance.now();

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, requestInit);

      if (response.ok) {
        const durationMs = Math.round(performance.now() - t0);
        const data = (await response.json()) as T;
        log.info({ method, url: urlPath, status: response.status, durationMs }, "Outbound request complete");
        log.debug({ method, url: urlPath, responseType: typeof data, isArray: Array.isArray(data) }, "Response details");
        return data;
      }

      const responseBody = await response.text().catch(() => "");
      const error = new HttpError(
        response.status,
        response.statusText,
        tryParseJSON(responseBody),
        url
      );

      // Retry on 429 (rate limited) or 5xx (server error)
      if (
        (error.isRateLimited || error.isServerError) &&
        attempt < maxRetries
      ) {
        const retryAfter = getRetryDelay(response, attempt);
        log.warn(
          { method, url: urlPath, status: response.status, attempt: attempt + 1, maxRetries, retryAfterMs: retryAfter },
          "Retrying request after error"
        );
        await sleep(retryAfter);
        lastError = error;
        continue;
      }

      throw error;
    } catch (err) {
      if (err instanceof HttpError) {
        const durationMs = Math.round(performance.now() - t0);
        log.error(
          { method, url: urlPath, status: err.status, durationMs, err },
          "Request failed with HTTP error"
        );
        throw err;
      }

      // Network/timeout errors — retry
      if (attempt < maxRetries) {
        log.warn(
          { method, url: urlPath, attempt: attempt + 1, maxRetries, err: err instanceof Error ? err.message : String(err) },
          "Retrying request after network/timeout error"
        );
        await sleep(1000 * Math.pow(2, attempt));
        lastError = err instanceof Error ? err : new Error(String(err));
        continue;
      }

      const durationMs = Math.round(performance.now() - t0);
      log.error(
        { method, url: urlPath, durationMs, err: err instanceof Error ? err.message : String(err) },
        "Request failed after all retries exhausted"
      );
      throw err;
    }
  }

  throw (
    lastError ??
    new Error(`Request to ${url} failed after ${maxRetries} retries`)
  );
}

/**
 * Parse rate limit headers from an HTTP response.
 * Works with both Hetzner (`RateLimit-*`) and GitHub (`X-RateLimit-*`) header formats.
 */
export function parseRateLimit(headers: Headers): RateLimitInfo {
  const limit =
    parseInt(
      headers.get("ratelimit-limit") ?? headers.get("x-ratelimit-limit") ?? ""
    ) || null;
  const remaining =
    parseInt(
      headers.get("ratelimit-remaining") ??
        headers.get("x-ratelimit-remaining") ??
        ""
    ) || null;
  const resetEpoch =
    parseInt(
      headers.get("ratelimit-reset") ?? headers.get("x-ratelimit-reset") ?? ""
    ) || null;
  const resetAt = resetEpoch ? new Date(resetEpoch * 1000) : null;

  return { limit, remaining, resetAt };
}

/** Calculate retry delay from Retry-After header or exponential backoff. */
function getRetryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = parseInt(retryAfter);
    if (!isNaN(seconds)) return seconds * 1000;
  }
  // Exponential backoff: 1s, 2s, 4s
  return 1000 * Math.pow(2, attempt);
}

function tryParseJSON(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Extract the pathname from a URL, stripping the origin for safe logging. */
function safeUrlPath(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}
