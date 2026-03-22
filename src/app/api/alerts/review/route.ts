/**
 * Weekly alert review API route.
 *
 * Returns aggregated alert data for the past 7 days including
 * total alerts, severity breakdown, noise score, and most frequent rule.
 *
 * GET /api/alerts/review
 */

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/guards";
import { getWeeklyAlertReview } from "@/lib/alerts/review";

/** GET /api/alerts/review — Weekly alert review summary. */
export const GET = withAuth(async () => {
  const review = await getWeeklyAlertReview();
  return NextResponse.json(review);
});
