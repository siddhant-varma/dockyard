import { NextResponse } from "next/server";
import { getDoraMetrics } from "@/lib/metrics/dora";
import { withAuthContext } from "@/lib/auth/guards";
import { requireProjectPermission } from "@/lib/auth/permissions";

/** GET /api/projects/:slug/dora — Retrieve all four DORA metrics for a project. */
export const GET = withAuthContext(async (request, user, context) => {
  const { slug } = await context.params;
  await requireProjectPermission(user.id, slug, "read");

  const sp = new URL(request.url).searchParams;
  const window = Math.max(1, Number(sp.get("window") ?? 30));

  const metrics = await getDoraMetrics(slug, { windowDays: window });
  return NextResponse.json(metrics);
});
