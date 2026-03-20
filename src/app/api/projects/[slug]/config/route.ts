import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/connection";
import { projects } from "@/db/schema";
import { getConfigEntries } from "@/lib/config/service";

type Params = Promise<{ slug: string }>;

/** GET /api/projects/:slug/config — List config entries (secrets masked). */
export async function GET(
  _request: NextRequest,
  { params }: { params: Params }
) {
  const { slug } = await params;

  const project = await db.query.projects.findFirst({
    where: eq(projects.slug, slug),
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const entries = await getConfigEntries(project.id);

  // Mask secret values for API response
  const masked = entries.map((e) => ({
    ...e,
    value: e.isSecret ? "***" : e.value,
  }));

  return NextResponse.json(masked);
}
