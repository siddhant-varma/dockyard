import { NextRequest, NextResponse } from "next/server";
import {
  getProject,
  updateProject,
  deleteProject,
} from "@/lib/projects/service";

type Params = Promise<{ slug: string }>;

/** GET /api/projects/:slug — Project detail. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Params }
) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  return NextResponse.json(project);
}

/** PUT /api/projects/:slug — Update project. */
export async function PUT(
  request: NextRequest,
  { params }: { params: Params }
) {
  const { slug } = await params;
  const body = (await request.json()) as Record<string, unknown>;

  try {
    const updated = await updateProject(slug, body);
    if (!updated) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/** DELETE /api/projects/:slug — Archive project (soft delete). */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Params }
) {
  const { slug } = await params;
  const archived = await deleteProject(slug);
  if (!archived) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  return NextResponse.json({ archived: true });
}
