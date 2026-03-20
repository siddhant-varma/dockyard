import { inngest } from "../client";
import { registerAllSources } from "@/lib/discovery/register";
import { scanAll } from "@/lib/discovery/scanner";

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
    const result = await step.run("scan-discovery-sources", async () => {
      registerAllSources();
      return scanAll();
    });
    return result;
  }
);
