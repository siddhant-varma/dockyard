/**
 * WeeklySummary — displays an AI-generated weekly project summary.
 *
 * Glass card with the AI narrative, highlights, concerns, and
 * next-week outlook. Shows "AI Generated" badge and date range.
 *
 * @param summary - The summary payload from ai_context_snapshots.
 */

interface SummaryData {
  projectName: string;
  period: { start: string; end: string };
  narrative: string;
  highlights: string[];
  concerns: string[];
  nextWeekOutlook: string;
  generatedAt: string;
}

interface WeeklySummaryProps {
  summary: SummaryData;
}

export function WeeklySummary({ summary }: WeeklySummaryProps) {
  const start = new Date(summary.period.start).toLocaleDateString();
  const end = new Date(summary.period.end).toLocaleDateString();

  return (
    <div className="rounded-xl border border-glass-border bg-glass-bg p-4 space-y-3 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-foreground">
            Weekly Summary
          </h4>
          <span className="rounded-full bg-purple-500/15 border border-purple-500/20 px-2 py-0.5 text-xs font-medium text-purple-400">
            AI Generated
          </span>
        </div>
        <span className="text-xs text-muted-foreground/60">
          {start} — {end}
        </span>
      </div>

      {/* Narrative */}
      <p className="text-sm leading-relaxed text-foreground/80">
        {summary.narrative}
      </p>

      {/* Highlights */}
      {summary.highlights.length > 0 && (
        <div>
          <h5 className="text-xs font-medium text-muted-foreground/70 mb-1">
            Highlights
          </h5>
          <ul className="list-disc list-inside text-sm text-foreground/70 space-y-0.5">
            {summary.highlights.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Concerns */}
      {summary.concerns.length > 0 && (
        <div>
          <h5 className="text-xs font-medium text-red-400/80 mb-1">
            Concerns
          </h5>
          <ul className="list-disc list-inside text-sm text-red-400/70 space-y-0.5">
            {summary.concerns.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Outlook */}
      <div className="rounded-lg bg-glass-hover border border-glass-border p-2 text-xs text-foreground/60">
        <strong className="text-foreground/80">Next week:</strong>{" "}
        {summary.nextWeekOutlook}
      </div>
    </div>
  );
}
