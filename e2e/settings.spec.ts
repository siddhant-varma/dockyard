/**
 * E2E tests for the settings page (/settings).
 *
 * Validates that all 7 tabs render, tab switching works, and the
 * General tab shows operating mode configuration.
 */

import { test, expect } from "@playwright/test";

test.describe("Settings Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings");
  });

  test("all 7 tabs render", async ({ page }) => {
    // Settings uses ClientTabs — all tabs should be visible as buttons
    const tabLabels = [
      "General",
      "Projects",
      "Sources",
      "Notifications",
      "AI",
      "MFA",
      "Audit",
    ];

    for (const label of tabLabels) {
      await expect(page.getByRole("button", { name: label })).toBeVisible();
    }
  });

  test("General tab is active by default and shows operating mode", async ({
    page,
  }) => {
    // General tab content — Environment card
    await expect(page.getByText("Environment")).toBeVisible();
    await expect(page.getByText("Operating Mode")).toBeVisible();
    // Service connections card
    await expect(page.getByText("Service Connections")).toBeVisible();
    // Service names
    await expect(page.getByText("Database")).toBeVisible();
    await expect(page.getByText("Inngest")).toBeVisible();
  });

  test("tab switching works — Projects tab", async ({ page }) => {
    const projectsTab = page.getByRole("button", { name: "Projects" });
    await projectsTab.click();

    // General tab content should no longer be visible
    await expect(page.getByText("Environment")).not.toBeVisible();
  });

  test("tab switching works — Sources tab", async ({ page }) => {
    const sourcesTab = page.getByRole("button", { name: "Sources" });
    await sourcesTab.click();

    // Sources tab content loads — General tab content hidden
    await expect(page.getByText("Environment")).not.toBeVisible();
  });

  test("tab switching works — Notifications tab", async ({ page }) => {
    const notificationsTab = page.getByRole("button", {
      name: "Notifications",
    });
    await notificationsTab.click();

    await expect(page.getByText("Environment")).not.toBeVisible();
  });

  test("tab switching works — AI tab", async ({ page }) => {
    const aiTab = page.getByRole("button", { name: "AI" });
    await aiTab.click();

    await expect(page.getByText("Environment")).not.toBeVisible();
  });

  test("tab switching works — MFA tab", async ({ page }) => {
    const mfaTab = page.getByRole("button", { name: "MFA" });
    await mfaTab.click();

    await expect(page.getByText("Environment")).not.toBeVisible();
  });

  test("tab switching works — Audit tab", async ({ page }) => {
    const auditTab = page.getByRole("button", { name: "Audit" });
    await auditTab.click();

    await expect(page.getByText("Environment")).not.toBeVisible();
  });

  test("switching back to General re-shows operating mode", async ({
    page,
  }) => {
    // Switch away from General
    const projectsTab = page.getByRole("button", { name: "Projects" });
    await projectsTab.click();
    await expect(page.getByText("Environment")).not.toBeVisible();

    // Switch back to General
    const generalTab = page.getByRole("button", { name: "General" });
    await generalTab.click();
    await expect(page.getByText("Operating Mode")).toBeVisible();
  });
});
