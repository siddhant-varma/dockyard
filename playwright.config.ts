import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E test configuration for DockYard.
 *
 * Uses DOCKYARD_DEMO=true so tests run against static demo data
 * without requiring a database or external APIs.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [
    ["html", { open: "never" }],
    ...(process.env.CI
      ? [["junit" as const, { outputFile: "test-results/junit.xml" }]]
      : []),
  ],
  use: {
    baseURL: "http://localhost:3001",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Production build: next dev compiles routes on first hit, so tab clicks
    // raced hydration and tests flaked. A built server is fast and stable.
    command:
      "DOCKYARD_DEMO=true npx next build && DOCKYARD_DEMO=true npx next start -p 3001",
    port: 3001,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
