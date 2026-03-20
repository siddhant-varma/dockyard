import { NextResponse } from "next/server";
import { getDeployDiff } from "@/lib/deployments/diff";
import { withAuthContext } from "@/lib/auth/guards";
import { requireProjectPermission } from "@/lib/auth/permissions";

/** GET /api/projects/:slug/deployments/:id/diff — Get the diff for a deployment. */
export const GET = withAuthContext(async (_request, user, context) => {
  const { slug, id } = await context.params;
  await requireProjectPermission(user.id, slug, "read");

  const diff = await getDeployDiff(slug, id);

  if (!diff) {
    return NextResponse.json(
      { error: "Deployment not found" },
      { status: 404 },
    );
  }

  return NextResponse.json(diff);
});
