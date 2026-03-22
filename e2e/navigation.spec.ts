/**
 * E2E tests for overall navigation across the DockYard app.
 *
 * Validates sidebar navigation between top-level pages, deep link
 * support for direct URL access, and 404 page rendering for
 * invalid routes.
 */

import { test, expect } from "@playwright/test";

test.describe("Navigation — Sidebar", () => {
  test("Home → Projects → Watchtower → Settings via sidebar", async ({
    page,
  }) => {
    // Start at Home
    await page.goto("/");
    await expect(page).toHaveTitle(/DockYard/);

    // Navigate to Projects via sidebar
    const projectsLink = page
      .locator("aside")
      .getByRole("link", { name: "Projects" });
    await projectsLink.click();
    await page.waitForURL("**/projects");
    await expect(page.getByText("Aether Core")).toBeVisible();

    // Navigate to Watchtower via sidebar
    const watchtowerLink = page
      .locator("aside")
      .getByRole("link", { name: "Watchtower" });
    await watchtowerLink.click();
    await page.waitForURL("**/watchtower");
    await expect(page.getByText("Void Proxy")).toBeVisible();

    // Navigate to Settings via sidebar
    const settingsLink = page
      .locator("aside")
      .getByRole("link", { name: "Settings" });
    await settingsLink.click();
    await page.waitForURL("**/settings");
    await expect(page.getByText("Operating Mode")).toBeVisible();

    // Navigate back Home
    const homeLink = page
      .locator("aside")
      .getByRole("link", { name: "Home" });
    await homeLink.click();
    await page.waitForURL("/");
    await expect(page.getByText("hetzner-cx31")).toBeVisible();
  });
});

test.describe("Navigation — Deep Links", () => {
  test("direct URL to /projects/aether-core loads correctly", async ({
    page,
  }) => {
    await page.goto("/projects/aether-core");
    await expect(
      page.getByRole("heading", { name: "Aether Core" })
    ).toBeVisible();
    await expect(page.getByText("active")).toBeVisible();
    await expect(page.getByText("healthy")).toBeVisible();
  });

  test("direct URL to /watchtower/void-proxy loads correctly", async ({
    page,
  }) => {
    await page.goto("/watchtower/void-proxy");
    await expect(
      page.getByRole("heading", { name: "Void Proxy" })
    ).toBeVisible();
    await expect(page.getByText("DOWN")).toBeVisible();
  });

  test("direct URL to /watchtower/alerts loads correctly", async ({
    page,
  }) => {
    await page.goto("/watchtower/alerts");
    await expect(
      page.getByRole("heading", { name: "Alerts" })
    ).toBeVisible();
    await expect(page.getByText("CPU > 90% for 5m")).toBeVisible();
  });

  test("direct URL to /watchtower/incidents loads correctly", async ({
    page,
  }) => {
    await page.goto("/watchtower/incidents");
    await expect(
      page.getByRole("heading", { name: "Incidents" })
    ).toBeVisible();
  });

  test("direct URL to /settings loads correctly", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText("Operating Mode")).toBeVisible();
  });

  test("direct URL to /self-health loads correctly", async ({ page }) => {
    await page.goto("/self-health");
    await expect(page.getByText("DockYard is")).toBeVisible();
    await expect(page.getByText("System Components")).toBeVisible();
  });
});

test.describe("Navigation — 404 Page", () => {
  test("404 page renders for invalid route", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");

    // 404 page content
    await expect(page.getByText("404")).toBeVisible();
    await expect(
      page.getByText("This page drifted out of orbit")
    ).toBeVisible();

    // "Back to Dashboard" link
    const backLink = page.getByRole("link", { name: "Back to Dashboard" });
    await expect(backLink).toBeVisible();

    // Clicking it navigates home
    await backLink.click();
    await page.waitForURL("/");
  });

  test("404 page renders for invalid project slug", async ({ page }) => {
    await page.goto("/projects/nonexistent-project-xyz");

    await expect(page.getByText("404")).toBeVisible();
    await expect(
      page.getByText("This page drifted out of orbit")
    ).toBeVisible();
  });

  test("404 page renders for invalid watchtower slug", async ({ page }) => {
    await page.goto("/watchtower/nonexistent-project-xyz");

    await expect(page.getByText("404")).toBeVisible();
    await expect(
      page.getByText("This page drifted out of orbit")
    ).toBeVisible();
  });
});
