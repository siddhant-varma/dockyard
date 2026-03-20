/**
 * WeeklySummary — displays an AI-generated weekly project summary.
 *
 * Shows the generated narrative, key highlights, concerns, and
 * next-week outlook with an "AI Generated" badge and timestamp.
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
    <div className="rounded-lg border p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold">Weekly Summary</h4>
          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
            AI Generated
          </span>
        </div>
        <span className="text-xs text-gray-500">
          {start} — {end}
        </span>
      </div>

      {/* Narrative */}
      <p className="text-sm text-gray-700">{summary.narrative}</p>

      {/* Highlights */}
      {summary.highlights.length > 0 && (
        <div>
          <h5 className="text-xs font-medium text-gray-500 mb-1">Highlights</h5>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-0.5">
            {summary.highlights.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Concerns */}
      {summary.concerns.length > 0 && (
        <div>
          <h5 className="text-xs font-medium text-red-500 mb-1">Concerns</h5>
          <ul className="list-disc list-inside text-sm text-red-600 space-y-0.5">
            {summary.concerns.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Outlook */}
      <div className="rounded bg-gray-50 p-2 text-xs text-gray-600">
        <strong>Next week:</strong> {summary.nextWeekOutlook}
      </div>
    </div>
  );
}
