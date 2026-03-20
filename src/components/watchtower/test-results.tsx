/**
 * TestResults — displays test run history with pass/fail indicators.
 */

interface TestRun {
  id: string;
  type: string;
  status: string;
  durationSecs: number | null;
  startedAt: string;
  results: unknown;
}

interface TestResultsProps {
  runs: TestRun[];
}

const STATUS_COLORS: Record<string, string> = {
  passed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  running: "bg-blue-100 text-blue-800",
  error: "bg-red-100 text-red-800",
  pending: "bg-gray-100 text-gray-800",
};

export function TestResults({ runs }: TestResultsProps) {
  if (runs.length === 0) {
    return <p className="text-sm text-gray-500">No test runs yet.</p>;
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-gray-600">Recent Runs</h4>
      {runs.map((run) => (
        <div key={run.id} className="flex items-center justify-between rounded border p-3">
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[run.status] ?? ""}`}>
              {run.status}
            </span>
            <span className="text-sm">{run.type}</span>
          </div>
          <div className="text-xs text-gray-500">
            {run.durationSecs != null && <span>{run.durationSecs}s · </span>}
            {new Date(run.startedAt).toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}
