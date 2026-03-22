/**
 * E2E tests for the watchtower section (/watchtower, alerts, incidents).
 *
 * Validates health overview grid, health detail page navigation,
 * sub-tab navigation, alerts dashboard, and incidents list.
 */

import { test, expect } from "@playwright/test";

test.describe("Watchtower — Health Overview", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/watchtower");
  });

  test("health overview loads with health cards", async ({ page }) => {
    // Demo data has 8 health projects
    await expect(page.getByText("Void Proxy")).toBeVisible();
    await expect(page.getByText("Nebula Gateway")).toBeVisible();
    await expect(page.getByText("Aether Core")).toBeVisible();
    await expect(page.getByText("Solaris DB")).toBeVisible();
    await expect(page.getByText("Chronos Engine")).toBeVisible();
    await expect(page.getByText("Prism UI")).toBeVisible();
    await expect(page.getByText("DockYard")).toBeVisible();
    await expect(page.getByText("Payments")).toBeVisible();
  });

  test("status summary strip shows health counts", async ({ page }) => {
    // Status summary strip renders
    await expect(page.getByText(/Healthy/)).toBeVisible();
    await expect(page.getByText(/Down/)).toBeVisible();
    await expect(page.getByText(/Degraded/)).toBeVisible();
    await expect(page.getByText("8 monitored")).toBeVisible();
  });

  test("click health card navigates to detail page", async ({ page }) => {
    // Click on Aether Core health card link
    const aetherLink = page.getByRole("link", { name: /Aether Core/ });
    await aetherLink.click();

    await page.waitForURL("**/watchtower/aether-core");

    // Detail page renders project name
    await expect(
      page.getByRole("heading", { name: "Aether Core" })
    ).toBeVisible();
  });

  test("watchtower page tabs render correctly", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: "Overview" })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Alerts" })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Incidents" })
    ).toBeVisible();
  });
});

test.describe("Watchtower — Health Detail", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/watchtower/aether-core");
  });

  test("health detail shows project name and status", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Aether Core" })
    ).toBeVisible();
    // Status badge shows "HEALTHY"
    await expect(page.getByText("HEALTHY")).toBeVisible();
    // Uptime value
    await expect(page.getByText("99.94%")).toBeVisible();
  });

  test("health detail shows component status", async ({ page }) => {
    await expect(page.getByText("Components")).toBeVisible();
    // Aether Core has API, DB, Redis components
    await expect(page.getByText("API")).toBeVisible();
    await expect(page.getByText("DB")).toBeVisible();
    await expect(page.getByText("Redis")).toBeVisible();
  });

  test("sub-tabs work — Health, Deployments, Logs, Tests, DORA", async ({
    page,
  }) => {
    // Health tab (current)
    const healthTab = page.getByRole("link", { name: "Health" });
    await expect(healthTab).toBeVisible();

    // Deployments tab
    const deploymentsTab = page.getByRole("link", { name: "Deployments" });
    await expect(deploymentsTab).toBeVisible();
    await deploymentsTab.click();
    await page.waitForURL("**/watchtower/aether-core/deployments");

    // Logs tab
    await page.goto("/watchtower/aether-core");
    const logsTab = page.getByRole("link", { name: "Logs" });
    await expect(logsTab).toBeVisible();
    await logsTab.click();
    await page.waitForURL("**/watchtower/aether-core/logs");

    // Tests tab
    await page.goto("/watchtower/aether-core");
    const testsTab = page.getByRole("link", { name: "Tests" });
    await expect(testsTab).toBeVisible();
    await testsTab.click();
    await page.waitForURL("**/watchtower/aether-core/tests");

    // DORA tab
    await page.goto("/watchtower/aether-core");
    const doraTab = page.getByRole("link", { name: "DORA" });
    await expect(doraTab).toBeVisible();
    await doraTab.click();
    await page.waitForURL("**/watchtower/aether-core/dora");
  });
});

test.describe("Watchtower — Alerts Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/watchtower/alerts");
  });

  test("alerts page loads with heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Alerts" })
    ).toBeVisible();
  });

  test("active alerts are displayed", async ({ page }) => {
    // Demo alert events
    await expect(page.getByText("CPU > 90% for 5m")).toBeVisible();
    await expect(
      page.getByText("Memory Usage Spike > 85%")
    ).toBeVisible();
    await expect(
      page.getByText("API Latency P99 > 400ms")
    ).toBeVisible();

    // Firing count text
    await expect(page.getByText("2 active alerts firing")).toBeVisible();
  });

  test("alert rules table is displayed", async ({ page }) => {
    await expect(page.getByText("Alert Rules")).toBeVisible();

    // Rule names from demo data
    await expect(page.getByText("CPU Critical")).toBeVisible();
    await expect(page.getByText("Memory High")).toBeVisible();
    await expect(page.getByText("Disk Full Impending")).toBeVisible();
  });

  test("alert severity badges are shown", async ({ page }) => {
    await expect(page.getByText("sev1").first()).toBeVisible();
    await expect(page.getByText("sev2").first()).toBeVisible();
    await expect(page.getByText("sev3").first()).toBeVisible();
  });
});

test.describe("Watchtower — Incidents Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/watchtower/incidents");
  });

  test("incidents page loads with heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Incidents" })
    ).toBeVisible();
  });

  test("incident list is displayed", async ({ page }) => {
    // Demo incidents
    await expect(
      page.getByText("Database connection pool exhaustion")
    ).toBeVisible();
    await expect(
      page.getByText("Intermittent latency on Auth Cluster-B")
    ).toBeVisible();
    await expect(
      page.getByText("Redis cache eviction rate spike")
    ).toBeVisible();
  });

  test("active incident count is shown", async ({ page }) => {
    // 4 non-resolved incidents in demo data
    await expect(page.getByText("4 active incidents")).toBeVisible();
  });

  test("incident cards show severity and status", async ({ page }) => {
    // Severity badges
    await expect(page.getByText("sev1").first()).toBeVisible();
    // Status badges
    await expect(page.getByText("investigating").first()).toBeVisible();
  });

  test("incident card links to incident detail", async ({ page }) => {
    // Click on the first incident
    const incidentLink = page.getByRole("link", {
      name: /Database connection pool exhaustion/,
    });
    await incidentLink.click();
    await page.waitForURL("**/watchtower/incidents/inc-001");
  });
});
