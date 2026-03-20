/**
 * Project AI Insights page — /projects/[slug]/insights
 *
 * Server component. Fetches weekly AI summaries and renders them as
 * glass cards. Glass Observatory styling.
 */

import { WeeklySummary } from "@/components/projects/weekly-summary";

type Params = Promise<{ slug: string }>;

interface SummaryRecord {
  projectName: string;
  period: { start: string; end: string };
  narrative: string;
  highlights: string[];
  concerns: string[];
  nextWeekOutlook: string;
  generatedAt: string;
}

const INTERNAL_BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

async function fetchSummaries(slug: string): Promise<SummaryRecord[]> {
  try {
    const res = await fetch(
      `${INTERNAL_BASE}/api/projects/${slug}/summaries`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    return res.json() as Promise<SummaryRecord[]>;
  } catch {
    return [];
  }
}

export default async function InsightsPage({ params }: { params: Params }) {
  const { slug } = await params;
  const summaries = await fetchSummaries(slug);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">AI Insights</h1>
        <p className="mt-0.5 text-sm text-muted-foreground/70">
          Weekly AI-generated summaries and milestone wrap-ups.
        </p>
      </div>

      {summaries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-glass-border-strong bg-glass-bg py-16 text-center backdrop-blur-sm">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-glass-border bg-glass-bg">
            <svg
              className="h-5 w-5 text-muted-foreground/40"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
              />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground">
            No AI summaries generated yet.
          </p>
          <p className="mt-1 text-xs text-muted-foreground/50">
            Summaries are generated weekly by the ai-summary background job.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {summaries.map((summary, i) => (
            <WeeklySummary key={i} summary={summary} />
          ))}
        </div>
      )}
    </div>
  );
}
