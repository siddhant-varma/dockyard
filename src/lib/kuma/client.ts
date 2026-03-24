/**
 * Uptime Kuma API client — typed wrapper around the Uptime Kuma REST API.
 *
 * Provides authenticated access to Uptime Kuma's monitor management,
 * status page, and notification APIs. All DockYard code should interact
 * with Kuma through this client, never by calling the Kuma API directly.
 *
 * Auth flow:
 * 1. POST /api/login with username + password
 * 2. Receive a JWT token in the response
 * 3. Pass the token as Authorization: Bearer header on subsequent requests
 *
 * @example
 * ```ts
 * import { getKumaClient } from "@/lib/kuma/client";
 * const client = getKumaClient();
 * if (client) {
 *   const monitors = await client.getMonitors();
 * }
 * ```
 *
 * @see https://github.com/louislam/uptime-kuma
 */

import { createModuleLogger } from "@/lib/logger";
import { HttpError } from "@/lib/http/client";
import type {
  KumaMonitor,
  KumaStatusPage,
  StatusPagePublicData,
  CreateMonitorInput,
} from "./types";

const log = createModuleLogger("kuma.client");

/** Configuration for connecting to an Uptime Kuma instance. */
export interface KumaClientConfig {
  /** Base URL of the Uptime Kuma instance (e.g., "http://localhost:3002"). */
  baseUrl: string;
  /** Username for Uptime Kuma login. */
  username: string;
  /** Password for Uptime Kuma login. */
  password: string;
}

/**
 * Typed client for the Uptime Kuma REST API.
 *
 * Handles authentication, request formatting, and response parsing.
 * All methods throw on HTTP errors after retries are exhausted.
 */
export class KumaClient {
  private readonly baseUrl: string;
  private readonly username: string;
  private readonly password: string;
  /** Cached JWT token from login. Null until first authentication. */
  private token: string | null = null;
  /** Timestamp when the token was obtained, for staleness checks. */
  private tokenObtainedAt: number = 0;
  /** Token validity duration in ms (re-authenticate after 1 hour). */
  private static readonly TOKEN_TTL_MS = 60 * 60 * 1000;

  constructor(config: KumaClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.username = config.username;
    this.password = config.password;
  }

  /**
   * Authenticate with the Uptime Kuma instance.
   * POSTs credentials to /api/login and caches the returned JWT token.
   * Called automatically before any authenticated request if needed.
   * @throws HttpError if login fails (invalid credentials, Kuma unavailable)
   */
  async login(): Promise<void> {
    const t0 = performance.now();
    log.info({ endpoint: "/api/login" }, "Authenticating with Uptime Kuma");

    const response = await this.rawFetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: this.username, password: this.password, token: "" }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      log.error({ status: response.status, durationMs: Math.round(performance.now() - t0) }, "Login failed");
      throw new HttpError(response.status, response.statusText, body, `${this.baseUrl}/api/login`);
    }

    const data = (await response.json()) as { token?: string; ok?: boolean };
    if (!data.token) {
      log.error({ responseKeys: Object.keys(data) }, "Login response missing token");
      throw new Error("Uptime Kuma login succeeded but no token was returned");
    }

    this.token = data.token;
    this.tokenObtainedAt = Date.now();
    log.info({ durationMs: Math.round(performance.now() - t0) }, "Login successful");
  }

  /**
   * List all monitors in the Uptime Kuma instance.
   * @returns Array of all configured monitors with their current status
   */
  async getMonitors(): Promise<KumaMonitor[]> {
    log.info({ endpoint: "/api/monitors" }, "Fetching all monitors");
    const data = await this.authedFetch<{ monitors: KumaMonitor[] }>("/api/monitors");
    const monitors = Array.isArray(data.monitors) ? data.monitors : [];
    log.info({ monitorCount: monitors.length }, "Fetched all monitors");
    return monitors;
  }

  /**
   * Get a single monitor by its ID.
   * @param id - The monitor's numeric ID in Uptime Kuma
   * @returns The monitor with its current status and configuration
   * @throws HttpError if the monitor is not found (404)
   */
  async getMonitor(id: number): Promise<KumaMonitor> {
    log.info({ monitorId: id }, "Fetching monitor");
    const data = await this.authedFetch<{ monitor: KumaMonitor }>(`/api/monitors/${id}`);
    log.info({ monitorId: id, monitorName: data.monitor?.name }, "Fetched monitor");
    return data.monitor;
  }

  /**
   * Get a status page by its slug.
   * @param slug - The URL-safe slug of the status page
   * @returns The status page configuration and monitor groups
   * @throws HttpError if the status page is not found (404)
   */
  async getStatusPage(slug: string): Promise<KumaStatusPage> {
    log.info({ slug }, "Fetching status page");
    const data = await this.authedFetch<{ statusPage: KumaStatusPage }>(`/api/status-pages/${slug}`);
    log.info({ slug, title: data.statusPage?.title }, "Fetched status page");
    return data.statusPage;
  }

  /**
   * Create a new monitor in Uptime Kuma.
   * @param input - Monitor configuration (name, type, url are required)
   * @returns The newly created monitor with its assigned ID
   */
  async createMonitor(input: CreateMonitorInput): Promise<KumaMonitor> {
    log.info({ monitorName: input.name, type: input.type }, "Creating monitor");
    const data = await this.authedFetch<{ monitor: KumaMonitor }>("/api/monitors", {
      method: "POST",
      body: input,
    });
    log.info({ monitorId: data.monitor?.id, monitorName: input.name }, "Monitor created");
    return data.monitor;
  }

  /**
   * Delete a monitor from Uptime Kuma.
   * @param id - The monitor's numeric ID to delete
   * @throws HttpError if the monitor is not found (404)
   */
  async deleteMonitor(id: number): Promise<void> {
    log.info({ monitorId: id }, "Deleting monitor");
    await this.authedFetch<{ ok: boolean }>(`/api/monitors/${id}`, { method: "DELETE" });
    log.info({ monitorId: id }, "Monitor deleted");
  }

  /**
   * Pause an active monitor (stops health checks without deleting).
   * @param id - The monitor's numeric ID to pause
   * @throws HttpError if the monitor is not found (404)
   */
  async pauseMonitor(id: number): Promise<void> {
    log.info({ monitorId: id }, "Pausing monitor");
    await this.authedFetch<{ ok: boolean }>(`/api/monitors/${id}/pause`, { method: "POST" });
    log.info({ monitorId: id }, "Monitor paused");
  }

  /**
   * Resume a paused monitor (restarts health checks).
   * @param id - The monitor's numeric ID to resume
   * @throws HttpError if the monitor is not found (404)
   */
  async resumeMonitor(id: number): Promise<void> {
    log.info({ monitorId: id }, "Resuming monitor");
    await this.authedFetch<{ ok: boolean }>(`/api/monitors/${id}/resume`, { method: "POST" });
    log.info({ monitorId: id }, "Monitor resumed");
  }

  /**
   * Fetch public status page data (no authentication required).
   *
   * Returns the publicly visible status page JSON, including current
   * heartbeat data, uptime percentages, and any active incidents.
   * Suitable for embedding or external consumption.
   *
   * @param slug - The URL-safe slug of the status page
   * @returns Public status page data with monitor status and uptime
   */
  async getStatusPageData(slug: string): Promise<StatusPagePublicData> {
    log.info({ slug }, "Fetching public status page data");

    const response = await this.rawFetch(`/api/status-page/${slug}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      log.error({ status: response.status, slug }, "Failed to fetch public status page data");
      throw new HttpError(
        response.status, response.statusText, body,
        `${this.baseUrl}/api/status-page/${slug}`
      );
    }

    const data = (await response.json()) as StatusPagePublicData;
    log.info({ slug, groupCount: data.publicGroupList?.length ?? 0 }, "Fetched public status page data");
    return data;
  }

  /* ================================================================
     Private Helpers
     ================================================================ */

  /** Ensure the client has a valid authentication token. */
  private async ensureAuthenticated(): Promise<void> {
    const isExpired = Date.now() - this.tokenObtainedAt > KumaClient.TOKEN_TTL_MS;
    if (!this.token || isExpired) {
      await this.login();
    }
  }

  /**
   * Make an authenticated fetch request to the Uptime Kuma API.
   * Handles login, token refresh, JSON parsing. Retries once on 401.
   * @param path - API path (e.g., "/api/monitors")
   * @param options - Optional fetch configuration
   * @returns Parsed JSON response body
   * @throws HttpError on non-2xx responses
   */
  private async authedFetch<T>(
    path: string,
    options: { method?: string; body?: unknown } = {}
  ): Promise<T> {
    await this.ensureAuthenticated();

    const { method = "GET", body } = options;
    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: `Bearer ${this.token}`,
    };
    if (body) headers["Content-Type"] = "application/json";

    let response = await this.rawFetch(path, {
      method, headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    // Retry once on 401 — token may have expired server-side
    if (response.status === 401) {
      log.warn({ path }, "Got 401, re-authenticating and retrying");
      await this.login();
      headers.Authorization = `Bearer ${this.token}`;
      response = await this.rawFetch(path, {
        method, headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    }

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new HttpError(response.status, response.statusText, errorBody, `${this.baseUrl}${path}`);
    }

    return (await response.json()) as T;
  }

  /**
   * Low-level fetch wrapper that prepends the base URL and applies timeout.
   * @param path - API path (e.g., "/api/login")
   * @param init - Standard fetch RequestInit options
   * @returns Raw Response object
   */
  private async rawFetch(path: string, init: RequestInit = {}): Promise<Response> {
    return fetch(`${this.baseUrl}${path}`, {
      ...init,
      signal: init.signal ?? AbortSignal.timeout(15000),
    });
  }
}

/* ================================================================
   Singleton Factory
   ================================================================ */

/** Cached singleton instance. */
let kumaClientInstance: KumaClient | null = null;

/**
 * Get a singleton KumaClient instance configured from environment variables.
 *
 * Reads `KUMA_URL`, `KUMA_USERNAME`, and `KUMA_PASSWORD` from `process.env`.
 * Returns `null` if any required variable is missing (Kuma integration is optional).
 *
 * @returns A configured KumaClient, or null if Kuma is not configured
 */
export function getKumaClient(): KumaClient | null {
  if (kumaClientInstance) return kumaClientInstance;

  const baseUrl = process.env.KUMA_URL;
  const username = process.env.KUMA_USERNAME;
  const password = process.env.KUMA_PASSWORD;

  if (!baseUrl || !username || !password) {
    log.debug(
      { hasUrl: !!baseUrl, hasUsername: !!username, hasPassword: !!password },
      "Uptime Kuma not configured — missing env vars"
    );
    return null;
  }

  kumaClientInstance = new KumaClient({ baseUrl, username, password });
  log.info({ baseUrl }, "Uptime Kuma client initialized");
  return kumaClientInstance;
}
