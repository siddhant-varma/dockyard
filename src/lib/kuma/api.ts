/**
 * Low-level Uptime Kuma API communication.
 *
 * Handles authentication and HTTP requests to the Uptime Kuma instance.
 * Used by the provisioner to create monitors programmatically.
 *
 * Requires `KUMA_URL`, `KUMA_USERNAME`, and `KUMA_PASSWORD` env vars.
 *
 * @module kuma/api
 */

import type { CreateMonitorInput, KumaMonitor } from "./types";
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("kuma.api");

/**
 * Authenticate with the Uptime Kuma instance and obtain a session token.
 *
 * @returns Bearer token string, or null on failure
 */
async function authenticate(): Promise<string | null> {
  const kumaUrl = process.env.KUMA_URL;
  const username = process.env.KUMA_USERNAME;
  const password = process.env.KUMA_PASSWORD;

  if (!kumaUrl || !username || !password) {
    log.warn("Kuma credentials not configured");
    return null;
  }

  try {
    const res = await fetch(`${kumaUrl}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      log.error({ status: res.status }, "Kuma authentication failed");
      return null;
    }

    const data = (await res.json()) as { token?: string };
    return data.token ?? null;
  } catch (err) {
    log.error({ err }, "Error connecting to Uptime Kuma");
    return null;
  }
}

/**
 * Create a monitor in Uptime Kuma via its REST API.
 *
 * @param input - Monitor creation parameters
 * @returns The created monitor, or null on failure
 */
export async function createKumaMonitor(
  input: CreateMonitorInput
): Promise<KumaMonitor | null> {
  const kumaUrl = process.env.KUMA_URL;
  if (!kumaUrl) return null;

  const token = await authenticate();
  if (!token) return null;

  try {
    const res = await fetch(`${kumaUrl}/api/monitors`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const errBody = await res.text();
      log.error(
        { status: res.status, body: errBody },
        "Failed to create Kuma monitor"
      );
      return null;
    }

    const result = (await res.json()) as {
      monitor?: KumaMonitor;
      monitorID?: number;
    };

    if (result.monitor) return result.monitor;

    // Some Kuma versions return just the ID
    if (result.monitorID) {
      return {
        id: result.monitorID,
        name: input.name,
        type: input.type,
        url: input.url,
        interval: input.interval ?? 60,
        active: true,
        status: 2,
        maxretries: input.maxretries ?? 0,
        accepted_statuscodes: input.accepted_statuscodes ?? ["200-299"],
        description: input.description ?? "",
        tags: [],
        parent: null,
        notificationIDList: {},
        method: input.method ?? "GET",
        body: input.body ?? null,
        headers: input.headers ?? null,
        port: input.port ?? null,
        hostname: input.hostname ?? null,
        keyword: input.keyword ?? null,
      };
    }

    log.warn("Unexpected response from Kuma monitor creation");
    return null;
  } catch (err) {
    log.error({ err }, "Error communicating with Uptime Kuma API");
    return null;
  }
}
