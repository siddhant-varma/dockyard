import { inngest } from "../client";
import { registerAllSources } from "@/lib/discovery/register";
import { scanAll } from "@/lib/discovery/scanner";
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("inngest.project-scanner");

/**
 * Periodic project discovery re-scan.
 * Runs every 5 minutes by default.
 * Scans all configured discovery sources and upserts new/removed projects.
 */
export const projectScanner = inngest.createFunction(
  {
    id: "project-scanner",
    name: "Project Discovery Scanner",
    triggers: [{ cron: "*/5 * * * *" }],
  },
  async ({ step }) => {
    log.info("Project discovery scan triggered");

    let result;
    try {
      result = await step.run("scan-discovery-sources", async () => {
        registerAllSources();
        return scanAll();
      });
    } catch (err) {
      log.error({ err }, "Project discovery scan failed");
      throw err;
    }

    log.info(
      { found: result.found, created: result.created, updated: result.updated },
      "Project discovery scan complete"
    );

    return result;
  }
);
