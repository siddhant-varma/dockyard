/**
 * Context handoff block generator for DockYard.
 *
 * Assembles structured project snapshots designed for consumption by
 * AI coding agents (Cursor, Claude Code, Copilot). Includes project
 * metadata, health, recent changes, blockers, config, and metrics.
 *
 * Outputs JSON or Markdown with a SHA-256 validation hash.
 */

import { createHash } from "crypto";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db/connection";
import {
  projects,
  projectHealth,
  signalEvents,
  roadmapItems,
  configEntries,
} from "@/db/schema";
import { calculateConfidence } from "./confidence";
import { calculateVelocity } from "./velocity";
import { calculateUptime } from "@/lib/health/uptime";

/** Format options for handoff block output. */
export type HandoffFormat = "json" | "markdown";

/** Structured context handoff block. */
export interface HandoffBlock {
  project: {
    name: string;
    slug: string;
    status: string;
    currentPhase: string | null;
    description: string | null;
  };
  health: {
    status: string;
    uptime30d: number;
  };
  confidence: {
    score: number;
    trend: string;
  };
  recentChanges: Array<{
    type: string;
    summary: string;
    date: string;
  }>;
  activeBlockers: Array<{
    description: string;
    severity: string;
  }>;
  nextTasks: Array<{
    title: string;
    phase: string | null;
  }>;
  configKeys: string[];
  generatedAt: string;
  validationHash: string;
}

/**
 * Generate a context handoff block for a project.
 *
 * @param projectId - The project's database ID
 * @param format - Output format: "json" or "markdown"
 * @returns Handoff block content as string (JSON or Markdown)
 */
export async function generateHandoffBlock(
  projectId: string,
  format: HandoffFormat = "json"
): Promise<string> {
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });
  if (!project) throw new Error("Project not found");

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [health, confidence, velocity, uptime, events, items, config] =
    await Promise.all([
      db.query.projectHealth.findFirst({
        where: eq(projectHealth.projectId, projectId),
      }),
      calculateConfidence(projectId),
      calculateVelocity(projectId, 7),
      calculateUptime(projectId, 30),
      db.query.signalEvents.findMany({
        where: eq(signalEvents.projectId, projectId),
        orderBy: desc(signalEvents.createdAt),
        limit: 20,
      }),
      db.query.roadmapItems.findMany({
        where: eq(roadmapItems.projectId, projectId),
      }),
      db.query.configEntries.findMany({
        where: eq(configEntries.projectId, projectId),
        columns: { key: true, isSecret: true },
      }),
    ]);

  const recentChanges = events
    .filter((e) => new Date(e.createdAt) > since)
    .slice(0, 10)
    .map((e) => ({
      type: e.eventType,
      summary: `${e.source}: ${e.eventType}`,
      date: new Date(e.createdAt).toISOString(),
    }));

  const activeBlockers: Array<{ description: string; severity: string }> = [];
  for (const item of items) {
    if (!item.blockers || !Array.isArray(item.blockers)) continue;
    for (const b of item.blockers) {
      const blocker = b as { description?: string; severity?: string; resolved_at?: string };
      if (!blocker.resolved_at) {
        activeBlockers.push({
          description: blocker.description ?? "Unknown blocker",
          severity: blocker.severity ?? "medium",
        });
      }
    }
  }

  const nextTasks = items
    .filter((i) => i.status === "planned" || i.status === "in_progress")
    .sort((a, b) => (a.sequenceOrder ?? 999) - (b.sequenceOrder ?? 999))
    .slice(0, 10)
    .map((i) => ({ title: i.title, phase: i.phase }));

  const configKeys = config
    .filter((c) => !c.isSecret)
    .map((c) => c.key);

  const block: HandoffBlock = {
    project: {
      name: project.name,
      slug: project.slug,
      status: project.status,
      currentPhase: project.currentPhase,
      description: project.description,
    },
    health: {
      status: health?.overallStatus ?? "unknown",
      uptime30d: uptime.percentage,
    },
    confidence: {
      score: confidence.score,
      trend: velocity.trend,
    },
    recentChanges,
    activeBlockers,
    nextTasks,
    configKeys,
    generatedAt: new Date().toISOString(),
    validationHash: "",
  };

  const content = JSON.stringify(block);
  block.validationHash = createHash("sha256").update(content).digest("hex");

  if (format === "markdown") {
    return renderMarkdown(block);
  }

  return JSON.stringify(block, null, 2);
}

function renderMarkdown(block: HandoffBlock): string {
  const lines: string[] = [
    `# ${block.project.name} — Context Handoff`,
    "",
    `**Status**: ${block.project.status} | **Phase**: ${block.project.currentPhase ?? "N/A"} | **Health**: ${block.health.status}`,
    `**Confidence**: ${Math.round(block.confidence.score * 100)}% (${block.confidence.trend}) | **Uptime (30d)**: ${block.health.uptime30d}%`,
    "",
  ];

  if (block.project.description) {
    lines.push(`> ${block.project.description}`, "");
  }

  if (block.activeBlockers.length > 0) {
    lines.push("## Active Blockers", "");
    for (const b of block.activeBlockers) {
      lines.push(`- **[${b.severity}]** ${b.description}`);
    }
    lines.push("");
  }

  if (block.nextTasks.length > 0) {
    lines.push("## Next Tasks", "");
    for (const t of block.nextTasks) {
      lines.push(`- ${t.title}${t.phase ? ` (${t.phase})` : ""}`);
    }
    lines.push("");
  }

  if (block.recentChanges.length > 0) {
    lines.push("## Recent Changes (7d)", "");
    for (const c of block.recentChanges) {
      lines.push(`- ${c.summary} (${new Date(c.date).toLocaleDateString()})`);
    }
    lines.push("");
  }

  lines.push(`---`, `Generated: ${block.generatedAt} | Hash: \`${block.validationHash}\``);

  return lines.join("\n");
}
