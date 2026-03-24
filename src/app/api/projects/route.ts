import { NextRequest, NextResponse } from "next/server";
import { listProjects, createProject } from "@/lib/projects/service";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/auth/audit";

/** GET /api/projects — List projects. Public sees public_visible only. */
export async function GET(request: NextRequest) {
  const session = await auth();
  const sp = request.nextUrl.searchParams;

  const isAdmin = !!session?.user;
  const filters = {
    status: sp.get("status") ?? undefined,
    publicOnly: !isAdmin || sp.get("public") === "true",
    search: sp.get("search") ?? undefined,
    limit: sp.get("limit") ? Number(sp.get("limit")) : undefined,
    offset: sp.get("offset") ? Number(sp.get("offset")) : undefined,
  };

  const projects = await listProjects(filters);
  return NextResponse.json(projects);
}

/** POST /api/projects — Create project. Auth required. */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;

  if (!body.name || !body.slug) {
    return NextResponse.json(
      { error: "name and slug are required" },
      { status: 400 }
    );
  }

  const project = await createProject({
    name: String(body.name),
    slug: String(body.slug),
    description: body.description ? String(body.description) : undefined,
    status: body.status ? String(body.status) : "active",
    techStack: Array.isArray(body.techStack) ? body.techStack : undefined,
    githubRepo: body.githubRepo ? String(body.githubRepo) : undefined,
    discoveredVia: "manual",
  });

  await logAudit({
    actorId: session.user.id,
    action: "project.create",
    targetType: "project",
    targetId: project.id,
    request,
  });

  return NextResponse.json(project, { status: 201 });
}
