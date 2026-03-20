/**
 * Smoke test runner for DockYard.
 *
 * Executes smoke tests against project endpoints by loading test
 * configurations from the database, making HTTP requests, and validating
 * responses against expected status codes, optional body patterns, and
 * latency thresholds. Results are stored in the test_runs table.
 */

import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db/connection";
import { testConfigs, testRuns } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { resolveProjectId } from "@/lib/auth/permissions";

/** Configuration for a single smoke test endpoint. */
export interface SmokeTestEndpoint {
  /** Name/label for this test case. */
  name: string;
  /** Full URL to test. */
  url: string;
  /** HTTP method (default: GET). */
  method?: string;
  /** Expected HTTP status code (default: 200). */
  expectedStatus?: number;
  /** Optional regex pattern to match against the response body. */
  bodyMatch?: string;
  /** Maximum acceptable latency in milliseconds. */
  latencyThresholdMs?: number;
  /** Request headers to include. */
  headers?: Record<string, string>;
  /** Request body for POST/PUT requests. */
  body?: string;
}

/** Result of running a single smoke test endpoint. */
export interface TestEndpointResult {
  name: string;
  url: string;
  passed: boolean;
  statusCode: number | null;
  latencyMs: number;
  error: string | null;
  checks: {
    statusMatch: boolean;
    bodyMatch: boolean | null;
    latencyOk: boolean | null;
  };
}

/** Result of a complete smoke test run. */
export interface TestRunResult {
  testRunId: string;
  projectId: string;
  totalTests: number;
  passed: number;
  failed: number;
  durationSecs: number;
  results: TestEndpointResult[];
}

/** Options for triggering a test run. */
export interface TriggerTestRunOptions {
  configId?: string;
  triggeredBy?: string;
}

/** Options for listing test results. */
export interface ListTestResultsOptions {
  limit?: number;
  offset?: number;
}

/**
 * Trigger a test run for a project by slug.
 *
 * Resolves the project slug to an ID, then runs smoke tests.
 * If a configId is provided, only that config's tests are run;
 * otherwise all enabled smoke tests for the project are executed.
 *
 * @param projectSlug - The project's URL slug
 * @param options - Options including configId filter and triggeredBy user
 * @returns The test run record with an `id` field
 * @throws ApiError NOT_FOUND if the project slug or config does not exist
 */
export async function triggerTestRun(
  projectSlug: string,
  options: TriggerTestRunOptions = {}
) {
  const projectId = await resolveProjectId(projectSlug);
  const result = await runSmokeTests(projectId, options);
  return { id: result.testRunId, ...result };
}

/**
 * List paginated test run results for a project by slug.
 *
 * @param projectSlug - The project's URL slug
 * @param options - Pagination options (limit, offset)
 * @returns Array of test run records
 * @throws ApiError NOT_FOUND if the project slug does not exist
 */
export async function listTestResults(
  projectSlug: string,
  options: ListTestResultsOptions = {}
) {
  const projectId = await resolveProjectId(projectSlug);
  const limit = options.limit ?? 20;
  const offset = options.offset ?? 0;

  return db.query.testRuns.findMany({
    where: eq(testRuns.projectId, projectId),
    orderBy: desc(testRuns.startedAt),
    limit,
    offset,
  });
}

/**
 * Run all enabled smoke tests for a project.
 *
 * Loads smoke test configurations from the test_configs table, executes
 * each endpoint test, validates the response, and stores the results
 * in the test_runs table.
 *
 * @param projectId - The project's database ID
 * @param options - Options including configId filter and triggeredBy user
 * @returns Aggregated test run results
 * @throws ApiError NOT_FOUND if no smoke test configs exist for the project
 */
export async function runSmokeTests(
  projectId: string,
  options: TriggerTestRunOptions = {}
): Promise<TestRunResult> {
  const conditions = [
    eq(testConfigs.projectId, projectId),
    eq(testConfigs.type, "smoke"),
    eq(testConfigs.enabled, true),
  ];

  if (options.configId) {
    conditions.push(eq(testConfigs.id, options.configId));
  }

  const configs = await db.query.testConfigs.findMany({
    where: and(...conditions),
  });

  if (configs.length === 0) {
    throw new ApiError(
      "NOT_FOUND",
      "No enabled smoke test configurations found for this project"
    );
  }

  const runStart = Date.now();

  const [testRun] = await db
    .insert(testRuns)
    .values({
      projectId,
      type: "smoke",
      status: "running",
      triggeredBy: options.triggeredBy,
      triggerReason: "manual",
      startedAt: new Date(),
    })
    .returning();

  const results: TestEndpointResult[] = [];

  for (const config of configs) {
    const endpoints = parseEndpoints(config.config);
    for (const endpoint of endpoints) {
      const result = await executeEndpointTest(endpoint);
      results.push(result);
    }
  }

  const durationSecs = Math.round((Date.now() - runStart) / 1000);
  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;
  const overallStatus = failed === 0 ? "passed" : "failed";

  await db
    .update(testRuns)
    .set({
      status: overallStatus,
      results,
      durationSecs,
      completedAt: new Date(),
    })
    .where(eq(testRuns.id, testRun.id));

  return {
    testRunId: testRun.id,
    projectId,
    totalTests: results.length,
    passed,
    failed,
    durationSecs,
    results,
  };
}

/**
 * Execute a single endpoint smoke test.
 *
 * Sends an HTTP request and validates the response against the
 * expected status code, optional body pattern, and latency threshold.
 */
async function executeEndpointTest(
  endpoint: SmokeTestEndpoint
): Promise<TestEndpointResult> {
  const method = endpoint.method ?? "GET";
  const expectedStatus = endpoint.expectedStatus ?? 200;

  const startTime = Date.now();

  try {
    const fetchOptions: RequestInit = {
      method,
      headers: endpoint.headers,
      signal: AbortSignal.timeout(30_000),
    };

    if (endpoint.body && (method === "POST" || method === "PUT" || method === "PATCH")) {
      fetchOptions.body = endpoint.body;
    }

    const response = await fetch(endpoint.url, fetchOptions);
    const latencyMs = Date.now() - startTime;

    const statusMatch = response.status === expectedStatus;

    let bodyMatch: boolean | null = null;
    if (endpoint.bodyMatch) {
      const responseBody = await response.text();
      const pattern = new RegExp(endpoint.bodyMatch);
      bodyMatch = pattern.test(responseBody);
    }

    let latencyOk: boolean | null = null;
    if (endpoint.latencyThresholdMs !== undefined) {
      latencyOk = latencyMs <= endpoint.latencyThresholdMs;
    }

    const passed =
      statusMatch &&
      (bodyMatch === null || bodyMatch) &&
      (latencyOk === null || latencyOk);

    return {
      name: endpoint.name,
      url: endpoint.url,
      passed,
      statusCode: response.status,
      latencyMs,
      error: null,
      checks: { statusMatch, bodyMatch, latencyOk },
    };
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    const error = err instanceof Error ? err.message : String(err);

    return {
      name: endpoint.name,
      url: endpoint.url,
      passed: false,
      statusCode: null,
      latencyMs,
      error,
      checks: { statusMatch: false, bodyMatch: null, latencyOk: null },
    };
  }
}

/**
 * Parse endpoint configurations from a test config's JSONB config field.
 *
 * Expects the config to contain an `endpoints` array of SmokeTestEndpoint objects.
 */
function parseEndpoints(config: unknown): SmokeTestEndpoint[] {
  if (!config || typeof config !== "object") {
    return [];
  }

  const configObj = config as Record<string, unknown>;
  const endpoints = configObj.endpoints;

  if (!Array.isArray(endpoints)) {
    return [];
  }

  return endpoints.filter(
    (e): e is SmokeTestEndpoint =>
      typeof e === "object" &&
      e !== null &&
      typeof (e as Record<string, unknown>).name === "string" &&
      typeof (e as Record<string, unknown>).url === "string"
  );
}
