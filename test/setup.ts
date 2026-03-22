/**
 * Vitest global setup file.
 *
 * Runs before every test file:
 * - Mocks Next.js navigation (useRouter, usePathname, etc.)
 * - Mocks Pino logger (prevent stdout noise in tests)
 * - Restores all mocks after each test
 */

import { afterEach, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
});

// Mock Next.js navigation — only active for test files that use it
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

// Mock Pino logger to prevent test output pollution
vi.mock("pino", () => {
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
    trace: vi.fn(),
    child: vi.fn().mockReturnThis(),
  };
  return { default: () => mockLogger };
});

// Mock the logger module directly
vi.mock("@/lib/logger", () => {
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
    trace: vi.fn(),
    child: vi.fn().mockReturnThis(),
  };
  return {
    rootLogger: mockLogger,
    getLogger: () => mockLogger,
    createModuleLogger: () => mockLogger,
  };
});
