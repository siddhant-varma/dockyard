import { NextResponse } from "next/server";
import { db } from "@/db/connection";
import { discoverySources } from "@/db/schema";
import { withAuth } from "@/lib/auth/guards";
import { logAudit } from "@/lib/auth/audit";

/**
 * GET /api/discovery/sources
 * List all configured discovery sources.
 */
export const GET = withAuth(async () => {
  const sources = await db.query.discoverySources.findMany({
    orderBy: (s, { asc }) => [asc(s.createdAt)],
  });
  return NextResponse.json(sources);
});

/**
 * POST /api/discovery/sources
 * Add a new discovery source.
 *
 * Body: { type: "filesystem"|"dokploy"|"github"|"manual", name: string, config: object }
 */
export const POST = withAuth(
  async (request, user) => {
    const body = (await request.json()) as Record<string, unknown>;

    const validTypes = ["filesystem", "dokploy", "github", "manual"];
    if (!body.type || !validTypes.includes(String(body.type))) {
      return NextResponse.json(
        { error: `type must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    if (!body.config || typeof body.config !== "object") {
      return NextResponse.json(
        { error: "config object is required" },
        { status: 400 }
      );
    }

    const [created] = await db
      .insert(discoverySources)
      .values({
        type: body.type as "filesystem" | "dokploy" | "github" | "manual",
        name: body.name as string,
        config: body.config,
        enabled: body.enabled !== false,
      })
      .returning();

    await logAudit({
      actorId: user.id,
      action: "discovery_source.create",
      targetType: "discovery_source",
      targetId: created.id,
      request,
    });

    return NextResponse.json(created, { status: 201 });
  },
  { role: "superadmin" }
);
