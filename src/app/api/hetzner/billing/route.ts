import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db/connection";
import { billingEstimates } from "@/db/schema";

/** GET /api/hetzner/billing — Latest billing estimate. */
export async function GET() {
  const latest = await db.query.billingEstimates.findFirst({
    orderBy: [desc(billingEstimates.calculatedAt)],
  });

  if (!latest) {
    return NextResponse.json({ error: "No billing data yet" }, { status: 404 });
  }

  return NextResponse.json(latest);
}
