/**
 * E2E tests for the home dashboard page (/).
 *
 * Validates that the main dashboard loads correctly in demo mode,
 * including metrics grid, server status, billing, logstream, and
 * navigation tabs.
 */

import { test, expect } from "@playwright/test";

test.describe("Dashboard — Home Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("page loads without error and has correct title", async ({ page }) => {
    await expect(page).toHaveTitle(/DockYard/);
    // Layout shell renders — sidebar has Home link
    await expect(page.getByRole("link", { name: "Home" })).toBeVisible();
  });

  test("metrics grid renders 4 metric cards", async ({ page }) => {
    // The metrics grid shows CPU, Memory, Network In/Out, Disk I/O
    await expect(page.getByText("CPU")).toBeVisible();
    await expect(page.getByText("Memory")).toBeVisible();
    await expect(page.getByText("Network In/Out")).toBeVisible();
    await expect(page.getByText("Disk I/O")).toBeVisible();

    // Each metric shows its current value
    await expect(page.getByText("23%")).toBeVisible();
    await expect(page.getByText("68%")).toBeVisible();
    await expect(page.getByText("2.4MB/s")).toBeVisible();
    await expect(page.getByText("140IOPS")).toBeVisible();
  });

  test("server status card is visible", async ({ page }) => {
    // Server name from demo data
    await expect(page.getByText("hetzner-cx31")).toBeVisible();
    // Status indicator — "running" appears somewhere
    await expect(page.getByText("running")).toBeVisible();
    // Server details
    await expect(page.getByText("167.235.1.92")).toBeVisible();
  });

  test("billing card is visible", async ({ page }) => {
    // Billing card shows cost figures from demo data
    await expect(page.getByText("$12.40")).toBeVisible();
    // Projected cost
    await expect(page.getByText("$16.20")).toBeVisible();
  });

  test("logstream section is visible", async ({ page }) => {
    // Live logstream shows log entries from demo data
    await expect(
      page.getByText("Health check passed").first()
    ).toBeVisible();
    await expect(
      page.getByText("Redis connection refused").first()
    ).toBeVisible();
  });

  test("navigation tabs work — Dashboard and Self-Health", async ({
    page,
  }) => {
    // Dashboard tab is present
    const dashboardTab = page.getByRole("link", { name: "Dashboard" }).first();
    await expect(dashboardTab).toBeVisible();

    // Self-Health tab is present
    const selfHealthTab = page.getByRole("link", { name: "Self-Health" });
    await expect(selfHealthTab).toBeVisible();

    // Navigate to Self-Health
    await selfHealthTab.click();
    await page.waitForURL("**/self-health");

    // Self-Health page renders its content
    await expect(page.getByText("DockYard is")).toBeVisible();
    await expect(page.getByText("System Components")).toBeVisible();
    await expect(page.getByText("Background Jobs")).toBeVisible();
  });
});
