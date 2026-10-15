/**
 * E2E tests for the projects section (/projects and /projects/[slug]).
 *
 * Validates project grid rendering, card navigation, project detail
 * page content, and tab navigation within the project detail view.
 */

import { test, expect } from "@playwright/test";

test.describe("Projects — Grid Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/projects");
  });

  test("projects grid loads with project cards", async ({ page }) => {
    // Demo data has 6 projects
    await expect(page.getByText("Aether Core").first()).toBeVisible();
    await expect(page.getByText("Nebula Gateway").first()).toBeVisible();
    await expect(page.getByText("Solaris DB").first()).toBeVisible();
    await expect(page.getByText("Void Proxy").first()).toBeVisible();
    await expect(page.getByText("Chronos Engine").first()).toBeVisible();
    await expect(page.getByText("Prism UI").first()).toBeVisible();
  });

  test("project cards show status and health indicators", async ({ page }) => {
    // Confidence score is rendered on each card
    await expect(page.getByText("confidence").first()).toBeVisible();
    // Health indicator text
    await expect(page.getByText("healthy").first()).toBeVisible();
  });

  test("click project card navigates to detail page", async ({ page }) => {
    // Click on the first project card link — Aether Core
    const aetherLink = page.getByRole("link", { name: /Aether Core/ }).first();
    await aetherLink.click();

    await page.waitForURL("**/projects/aether-core");

    // Project detail page loads with project name
    await expect(
      page.getByRole("heading", { name: "Aether Core" })
    ).toBeVisible();
  });
});

test.describe("Projects — Detail Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/projects/aether-core");
  });

  test("project detail shows project name and status", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Aether Core" })
    ).toBeVisible();
    // Status badge
    await expect(page.getByText("active").first()).toBeVisible();
    // Health status
    await expect(page.getByText("healthy").first()).toBeVisible();
    // Confidence score (98% from 0.984)
    await expect(page.getByText("98% Confidence").first()).toBeVisible();
  });

  test("project detail shows description", async ({ page }) => {
    await expect(
      page.getByText("Next.js dashboard for internal ops").first()
    ).toBeVisible();
  });

  test("project detail shows phase timeline", async ({ page }) => {
    await expect(page.getByText("Phase Timeline").first()).toBeVisible();
    await expect(page.getByText("Phase 0").first()).toBeVisible();
    await expect(page.getByText("Phase 1").first()).toBeVisible();
    await expect(page.getByText("Phase 2").first()).toBeVisible();
    await expect(page.getByText("Phase 3").first()).toBeVisible();
  });

  test("project detail shows blockers section", async ({ page }) => {
    await expect(page.getByText("Blockers (2 active)").first()).toBeVisible();
    await expect(
      page.getByText("Redis connection timeout under load").first()
    ).toBeVisible();
  });

  test("project detail shows tech stack", async ({ page }) => {
    await expect(page.getByText("Tech Stack").first()).toBeVisible();
    await expect(page.getByText("Next.js").first()).toBeVisible();
    await expect(page.getByText("TypeScript").first()).toBeVisible();
    await expect(page.getByText("PostgreSQL").first()).toBeVisible();
  });

  test("project detail shows activity feed", async ({ page }) => {
    await expect(
      page.getByText("3 commits pushed to main").first()
    ).toBeVisible();
    await expect(page.getByText("Deploy #142 succeeded").first()).toBeVisible();
  });

  test("tab navigation works across project sub-pages", async ({ page }) => {
    // Overview tab is shown (current page)
    const overviewTab = page.getByRole("link", { name: "Overview" });
    await expect(overviewTab).toBeVisible();

    // Roadmap tab
    const roadmapTab = page.getByRole("link", { name: "Roadmap" });
    await expect(roadmapTab).toBeVisible();
    await roadmapTab.click();
    await page.waitForURL("**/projects/aether-core/roadmap");

    // Config tab
    await page.goto("/projects/aether-core");
    const configTab = page.getByRole("link", { name: "Config" });
    await expect(configTab).toBeVisible();
    await configTab.click();
    await page.waitForURL("**/projects/aether-core/config");

    // Members tab
    await page.goto("/projects/aether-core");
    const membersTab = page.getByRole("link", { name: "Members" });
    await expect(membersTab).toBeVisible();
    await membersTab.click();
    await page.waitForURL("**/projects/aether-core/members");

    // SLO tab
    await page.goto("/projects/aether-core");
    const sloTab = page.getByRole("link", { name: "SLO" });
    await expect(sloTab).toBeVisible();
    await sloTab.click();
    await page.waitForURL("**/projects/aether-core/slo");

    // Insights tab
    await page.goto("/projects/aether-core");
    const insightsTab = page.getByRole("link", { name: "Insights" });
    await expect(insightsTab).toBeVisible();
    await insightsTab.click();
    await page.waitForURL("**/projects/aether-core/insights");

    // Settings tab (project-level)
    await page.goto("/projects/aether-core");
    // Sidebar also has a "Settings" link; target the project tab by href
    const settingsTab = page.locator(
      'a[href="/projects/aether-core/settings"]'
    );
    await expect(settingsTab).toBeVisible();
    await settingsTab.click();
    await page.waitForURL("**/projects/aether-core/settings");
  });
});
