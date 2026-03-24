/**
 * Kuma monitor reconciler — Inngest background function.
 *
 * Triggered when a new project is discovered (`project.discovered` event).
 * Ensures each project with a health endpoint has a corresponding
 * Uptime Kuma monitor provisioned. Skips projects that already have
 * monitors linked in the `kuma_monitors` table.
 *
 * Only runs when Kuma is configured (`KUMA_URL` env var is set).
 */

import { inngest } from "../client";
import {
  provisionProjectMonitors,
  hasMonitors,
} from "@/lib/kuma/provisioner";
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("inngest.kuma-monitor-sync");

/**
 * Reconcile Kuma monitors for a newly discovered project.
 *
 * Listens for `dockyard/project.discovered` events emitted by the
 * discovery scanner and provisions Kuma monitors if the project has
 * a health endpoint and Kuma is configured.
 */
export const kumaMonitorSync = inngest.createFunction(
  {
    id: "kuma-monitor-sync",
    name: "Kuma Monitor Sync",
    triggers: [{ event: "dockyard/project.discovered" }],
  },
  async ({ event, step }) => {
    const projectId = event.data.projectId as string;
    const projectSlug = event.data.projectSlug as string;
    const healthEndpoint = event.data.healthEndpoint as string | undefined;
    const dipLevel = (event.data.dipLevel as number) ?? 0;

    if (!projectId || !projectSlug) {
      log.warn("Missing projectId or projectSlug in event — skipping");
      return { error: "Missing required event data" };
    }

    // Check if Kuma is configured
    if (!process.env.KUMA_URL) {
      log.debug("Kuma not configured — skipping monitor sync");
      return { skipped: true, reason: "Kuma not configured" };
    }

    // Check if monitors already exist
    const alreadyProvisioned = await step.run(
      "check-existing-monitors",
      async () => {
        return hasMonitors(projectId);
      }
    );

    if (alreadyProvisioned) {
      log.info(
        { projectId, projectSlug },
        "Monitors already exist — skipping"
      );
      return { skipped: true, reason: "Monitors already exist" };
    }

    // Provision monitors
    const result = await step.run("provision-monitors", async () => {
      return provisionProjectMonitors(
        projectId,
        projectSlug,
        healthEndpoint,
        dipLevel
      );
    });

    log.info(
      {
        projectId,
        projectSlug,
        created: result.created,
        errors: result.errors,
      },
      "Kuma monitor sync complete"
    );

    return result;
  }
);
