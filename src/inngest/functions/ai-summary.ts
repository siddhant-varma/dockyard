/**
 * AI weekly summary generation worker.
 *
 * Cron: Monday at 09:00. Generates weekly summaries for all active projects
 * and milestone wrap-ups for any phases completed in the past week.
 */

import { inngest } from "../client";
import { eq } from "drizzle-orm";
import { db } from "@/db/connection";
import { projects, roadmapItems } from "@/db/schema";
import { generateWeeklySummary, generateMilestoneWrapUp } from "@/lib/ai/summaries";
import { notifySSE } from "@/lib/sse/notify";

export const aiSummary = inngest.createFunction(
  {
    id: "ai-summary",
    name: "AI Weekly Summary",
    triggers: [{ cron: "0 9 * * 1" }],
  },
  async ({ step }) => {
    const activeProjects = await step.run("load-active-projects", async () => {
      return db.query.projects.findMany({
        where: eq(projects.status, "active"),
        columns: { id: true, name: true },
      });
    });

    if (activeProjects.length === 0) {
      return { summariesGenerated: 0, milestoneWrapUps: 0 };
    }

    const summaries = await step.run("generate-weekly-summaries", async () => {
      const results = [];
      for (const project of activeProjects) {
        const summary = await generateWeeklySummary(project.id);
        results.push(summary);
      }
      return results;
    });

    const wrapUps = await step.run("check-milestone-completions", async () => {
      const results = [];
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      for (const project of activeProjects) {
        const items = await db.query.roadmapItems.findMany({
          where: eq(roadmapItems.projectId, project.id),
        });

        const phases = [...new Set(items.map((i) => i.phase).filter(Boolean))];

        for (const phase of phases) {
          const phaseItems = items.filter((i) => i.phase === phase);
          const allCompleted = phaseItems.every((i) => i.status === "completed");
          const recentlyCompleted = phaseItems.some(
            (i) => i.completedAt && new Date(i.completedAt) > oneWeekAgo
          );

          if (allCompleted && recentlyCompleted && phase) {
            const wrapUp = await generateMilestoneWrapUp(project.id, phase);
            results.push(wrapUp);
          }
        }
      }
      return results;
    });

    await step.run("broadcast-summaries", async () => {
      for (const summary of summaries) {
        await notifySSE("summary.generated", {
          projectId: summary.projectId,
          type: "weekly",
          timestamp: new Date().toISOString(),
        });
      }
    });

    return {
      summariesGenerated: summaries.length,
      milestoneWrapUps: wrapUps.length,
    };
  }
);
