/**
 * Confidence score recalculation worker.
 *
 * Cron: every 6 hours. Recalculates confidence for all active projects,
 * stores automated checkpoints, and emits SSE events. Fires a low-confidence
 * alert when a score drops below 0.30.
 */

import { inngest } from "../client";
import { eq } from "drizzle-orm";
import { db } from "@/db/connection";
import { projects, checkpoints } from "@/db/schema";
import { calculateConfidence } from "@/lib/ai/confidence";
import { notifySSE } from "@/lib/sse/notify";
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("inngest.confidence-scorer");

export const confidenceScorer = inngest.createFunction(
  {
    id: "confidence-scorer",
    name: "Confidence Scorer",
    triggers: [{ cron: "0 */6 * * *" }],
  },
  async ({ step }) => {
    log.info("Confidence scoring started");

    const activeProjects = await step.run("load-active-projects", async () => {
      return db.query.projects.findMany({
        where: eq(projects.status, "active"),
        columns: { id: true, name: true },
      });
    });

    if (activeProjects.length === 0) {
      log.info("No active projects found — skipping confidence scoring");
      return { projectsScored: 0 };
    }

    const results = await step.run("calculate-scores", async () => {
      const scores = [];
      for (const project of activeProjects) {
        const result = await calculateConfidence(project.id);

        await db.insert(checkpoints).values({
          projectId: project.id,
          title: `Automated confidence: ${(result.score * 100).toFixed(0)}%`,
          summary: JSON.stringify(result.breakdown),
          type: "automated",
          confidence: String(result.score),
          snapshotDate: new Date(),
        });

        scores.push({ ...result, name: project.name });
      }
      return scores;
    });

    await step.run("broadcast-and-alert", async () => {
      for (const result of results) {
        await notifySSE("confidence.updated", {
          projectId: result.projectId,
          score: result.score,
          timestamp: new Date().toISOString(),
        });

        if (result.score < 0.3) {
          await inngest.send({
            name: "dockyard/confidence.low",
            data: {
              projectId: result.projectId,
              projectName: result.name,
              score: result.score,
            },
          });
        }
      }
    });

    const scoresSummary = results.map(
      (r: { projectId: string; score: number }) => ({ projectId: r.projectId, score: r.score })
    );
    log.info(
      { projectsScored: results.length, scores: scoresSummary },
      "Confidence scoring complete"
    );

    return {
      projectsScored: results.length,
      scores: scoresSummary,
    };
  }
);
