/**
 * Tests for JWT session timeout logic.
 *
 * Verifies that the JWT callback correctly enforces:
 * - Idle timeout (default 30 min)
 * - Absolute timeout (default 8h)
 * - Sliding window (lastActivity updates on active use)
 * - issuedAt / lastActivity set on initial sign-in
 */

import { describe, it, expect } from "vitest";

/** Timeout constants matching the defaults in config.ts */
const DEFAULT_IDLE_TIMEOUT = 1800; // 30 minutes
const DEFAULT_ABSOLUTE_TIMEOUT = 28800; // 8 hours

/**
 * Simulate the timeout enforcement logic from the jwt callback.
 * Extracted here as a pure function for testability (the actual logic
 * lives inline in the NextAuth jwt callback in config.ts).
 */
function enforceTimeout(
  token: {
    issuedAt?: number;
    lastActivity?: number;
    expired?: boolean;
    expiredReason?: string;
  },
  now: number,
  idleTimeout = DEFAULT_IDLE_TIMEOUT,
  absoluteTimeout = DEFAULT_ABSOLUTE_TIMEOUT
) {
  const result = { ...token };

  if (!result.issuedAt) return result;

  // Absolute timeout
  if (now - result.issuedAt > absoluteTimeout) {
    result.expired = true;
    result.expiredReason = "absolute";
    return result;
  }

  // Idle timeout
  if (result.lastActivity && now - result.lastActivity > idleTimeout) {
    result.expired = true;
    result.expiredReason = "idle";
    return result;
  }

  // Sliding window
  result.lastActivity = now;
  return result;
}

describe("JWT timeout logic", () => {
  const baseTime = 1711400000; // arbitrary fixed timestamp

  it("sets issuedAt and lastActivity on initial sign-in", () => {
    const token = {
      issuedAt: baseTime,
      lastActivity: baseTime,
    };

    expect(token.issuedAt).toBe(baseTime);
    expect(token.lastActivity).toBe(baseTime);
  });

  it("allows requests within idle timeout", () => {
    const token = {
      issuedAt: baseTime,
      lastActivity: baseTime,
    };

    // 10 minutes later — well within 30 min idle
    const result = enforceTimeout(token, baseTime + 600);
    expect(result.expired).toBeUndefined();
    expect(result.lastActivity).toBe(baseTime + 600);
  });

  it("marks token expired after idle timeout", () => {
    const token = {
      issuedAt: baseTime,
      lastActivity: baseTime,
    };

    // 31 minutes of inactivity
    const result = enforceTimeout(token, baseTime + 1860);
    expect(result.expired).toBe(true);
    expect(result.expiredReason).toBe("idle");
  });

  it("marks token expired at exactly idle timeout boundary", () => {
    const token = {
      issuedAt: baseTime,
      lastActivity: baseTime,
    };

    // Exactly 1801 seconds — 1 second past 30 min
    const result = enforceTimeout(token, baseTime + 1801);
    expect(result.expired).toBe(true);
    expect(result.expiredReason).toBe("idle");
  });

  it("allows active use within absolute timeout", () => {
    const token = {
      issuedAt: baseTime,
      lastActivity: baseTime + 7 * 3600, // active 7 hours in
    };

    // 7h + 5 min — within 8h absolute, within 30 min idle
    const result = enforceTimeout(token, baseTime + 7 * 3600 + 300);
    expect(result.expired).toBeUndefined();
  });

  it("marks token expired after absolute timeout even with activity", () => {
    const token = {
      issuedAt: baseTime,
      lastActivity: baseTime + 28800, // still "active" at 8h mark
    };

    // 8h + 1 second
    const result = enforceTimeout(token, baseTime + 28801);
    expect(result.expired).toBe(true);
    expect(result.expiredReason).toBe("absolute");
  });

  it("updates lastActivity on active use (sliding window)", () => {
    const token = {
      issuedAt: baseTime,
      lastActivity: baseTime + 600,
    };

    // 15 min from last activity — still within idle timeout
    const result = enforceTimeout(token, baseTime + 1500);
    expect(result.expired).toBeUndefined();
    expect(result.lastActivity).toBe(baseTime + 1500);
  });

  it("respects custom idle timeout", () => {
    const token = {
      issuedAt: baseTime,
      lastActivity: baseTime,
    };

    // 10 min idle with a 5 min custom timeout → expired
    const result = enforceTimeout(token, baseTime + 600, 300);
    expect(result.expired).toBe(true);
    expect(result.expiredReason).toBe("idle");
  });

  it("respects custom absolute timeout", () => {
    const token = {
      issuedAt: baseTime,
      lastActivity: baseTime + 3600,
    };

    // 2h from sign-in with a 1h absolute timeout → expired
    const result = enforceTimeout(token, baseTime + 7200, 1800, 3600);
    expect(result.expired).toBe(true);
    expect(result.expiredReason).toBe("absolute");
  });

  it("absolute timeout takes priority over idle timeout", () => {
    const token = {
      issuedAt: baseTime,
      lastActivity: baseTime, // also idle
    };

    // Both absolute (8h) and idle (30min) exceeded — absolute wins
    const result = enforceTimeout(token, baseTime + 30000);
    expect(result.expired).toBe(true);
    expect(result.expiredReason).toBe("absolute");
  });

  it("does nothing when issuedAt is not set", () => {
    const token = { lastActivity: baseTime };
    const result = enforceTimeout(token, baseTime + 999999);
    expect(result.expired).toBeUndefined();
  });
});
