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
    await expect(page.getByText("Aether Core")).toBeVisible();
    await expect(page.getByText("Nebula Gateway")).toBeVisible();
    await expect(page.getByText("Solaris DB")).toBeVisible();
    await expect(page.getByText("Void Proxy")).toBeVisible();
    await expect(page.getByText("Chronos Engine")).toBeVisible();
    await expect(page.getByText("Prism UI")).toBeVisible();
  });

  test("project cards show status and health indicators", async ({
    page,
  }) => {
    // Status badges are rendered
    await expect(page.getByText("active").first()).toBeVisible();
    // Health indicator text
    await expect(page.getByText("healthy").first()).toBeVisible();
  });

  test("click project card navigates to detail page", async ({ page }) => {
    // Click on the first project card link — Aether Core
    const aetherLink = page.getByRole("link", { name: /Aether Core/ });
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
    await expect(page.getByText("active")).toBeVisible();
    // Health status
    await expect(page.getByText("healthy")).toBeVisible();
    // Confidence score (98% from 0.984)
    await expect(page.getByText("98% Confidence")).toBeVisible();
  });

  test("project detail shows description", async ({ page }) => {
    await expect(
      page.getByText("Next.js dashboard for internal ops")
    ).toBeVisible();
  });

  test("project detail shows phase timeline", async ({ page }) => {
    await expect(page.getByText("Phase Timeline")).toBeVisible();
    await expect(page.getByText("Phase 0")).toBeVisible();
    await expect(page.getByText("Phase 1")).toBeVisible();
    await expect(page.getByText("Phase 2")).toBeVisible();
    await expect(page.getByText("Phase 3")).toBeVisible();
  });

  test("project detail shows blockers section", async ({ page }) => {
    await expect(page.getByText("Blockers (2 active)")).toBeVisible();
    await expect(
      page.getByText("Redis connection timeout under load")
    ).toBeVisible();
  });

  test("project detail shows tech stack", async ({ page }) => {
    await expect(page.getByText("Tech Stack")).toBeVisible();
    await expect(page.getByText("Next.js")).toBeVisible();
    await expect(page.getByText("TypeScript")).toBeVisible();
    await expect(page.getByText("PostgreSQL")).toBeVisible();
  });

  test("project detail shows activity feed", async ({ page }) => {
    await expect(
      page.getByText("3 commits pushed to main")
    ).toBeVisible();
    await expect(page.getByText("Deploy #142 succeeded")).toBeVisible();
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
    const settingsTab = page.getByRole("link", { name: "Settings" }).first();
    await expect(settingsTab).toBeVisible();
    await settingsTab.click();
    await page.waitForURL("**/projects/aether-core/settings");
  });
});
