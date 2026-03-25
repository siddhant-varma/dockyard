/**
 * Tests for the token-bucket rate limiter.
 *
 * Verifies that the rate limiter correctly:
 * - Allows requests within the limit
 * - Blocks requests exceeding the limit
 * - Provides retry-after hints
 * - Refills tokens after the window elapses
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests within the limit", () => {
    const key = "test-allow";
    const result1 = rateLimit(key, 3, 60_000);
    const result2 = rateLimit(key, 3, 60_000);
    const result3 = rateLimit(key, 3, 60_000);

    expect(result1.allowed).toBe(true);
    expect(result2.allowed).toBe(true);
    expect(result3.allowed).toBe(true);
  });

  it("blocks the request exceeding the limit", () => {
    const key = "test-block";
    rateLimit(key, 2, 60_000);
    rateLimit(key, 2, 60_000);
    const result = rateLimit(key, 2, 60_000);

    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("returns retryAfter in seconds", () => {
    const key = "test-retry";
    rateLimit(key, 1, 60_000);
    const result = rateLimit(key, 1, 60_000);

    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeLessThanOrEqual(60);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("refills tokens after the window elapses", () => {
    const key = "test-refill";
    rateLimit(key, 1, 10_000);

    // Exhausted
    const blocked = rateLimit(key, 1, 10_000);
    expect(blocked.allowed).toBe(false);

    // Advance past the window
    vi.advanceTimersByTime(10_001);

    const refilled = rateLimit(key, 1, 10_000);
    expect(refilled.allowed).toBe(true);
  });

  it("uses separate buckets for different keys", () => {
    const key1 = "test-key-1";
    const key2 = "test-key-2";

    rateLimit(key1, 1, 60_000);
    const blocked = rateLimit(key1, 1, 60_000);
    const allowed = rateLimit(key2, 1, 60_000);

    expect(blocked.allowed).toBe(false);
    expect(allowed.allowed).toBe(true);
  });

  it("simulates auth rate limit: 5 attempts per 15 min", () => {
    const key = "192.168.1.1:/api/auth";
    const limit = 5;
    const windowMs = 15 * 60 * 1000;

    for (let i = 0; i < 5; i++) {
      expect(rateLimit(key, limit, windowMs).allowed).toBe(true);
    }

    // 6th attempt should be blocked
    const result = rateLimit(key, limit, windowMs);
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeLessThanOrEqual(15 * 60);
  });
});
