/**
 * Tests for log sampling logic.
 *
 * Verifies that shouldSample correctly applies sampling rates
 * per category, including edge cases for rate 0, rate 1,
 * and unknown categories.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { shouldSample } from "./sampling";

describe("shouldSample", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns false for rate 0 (sse.heartbeat is never logged)", () => {
    // sse.heartbeat has rate 0 — should always return false
    const results = Array.from({ length: 100 }, () =>
      shouldSample("sse.heartbeat")
    );

    expect(results.every((r) => r === false)).toBe(true);
  });

  it("returns true for unknown categories (default rate 1.0)", () => {
    // Unknown categories default to rate 1.0 — always log
    const results = Array.from({ length: 100 }, () =>
      shouldSample("unknown.category")
    );

    expect(results.every((r) => r === true)).toBe(true);
  });

  it("health.success has low sample rate (0.01)", () => {
    // With rate 0.01, most calls should return false.
    // Mock Math.random to verify the threshold comparison.
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    expect(shouldSample("health.success")).toBe(false);
  });

  it("health.success passes when random is below rate", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.005);

    expect(shouldSample("health.success")).toBe(true);
  });

  it("metrics.scrape.success has low sample rate (0.01)", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.02);

    expect(shouldSample("metrics.scrape.success")).toBe(false);
  });

  it("api.read.success has 10% sample rate", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.05);
    expect(shouldSample("api.read.success")).toBe(true);

    vi.spyOn(Math, "random").mockReturnValue(0.15);
    expect(shouldSample("api.read.success")).toBe(false);
  });

  it("rate >= 1 always returns true (no random check)", () => {
    // Unknown categories have rate 1.0, which should bypass Math.random
    const mockRandom = vi.spyOn(Math, "random");

    shouldSample("any.new.category");

    // Math.random should NOT be called for rate >= 1
    expect(mockRandom).not.toHaveBeenCalled();
  });

  it("rate 0 always returns false without calling Math.random", () => {
    const mockRandom = vi.spyOn(Math, "random");

    shouldSample("sse.heartbeat");

    expect(mockRandom).not.toHaveBeenCalled();
  });
});
