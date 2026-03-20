/**
 * DeployDiff — shows what changed between deployments.
 */

interface DeployDiffData {
  filesChanged: number;
  commits: Array<{ sha: string; message: string }>;
  configChanges: Array<{ key: string; action: string }>;
}

interface DeployDiffProps {
  diff: DeployDiffData | null;
}

export function DeployDiff({ diff }: DeployDiffProps) {
  if (!diff) return <p className="text-sm text-gray-500">No diff data available.</p>;

  return (
    <div className="space-y-3 text-sm">
      <div className="text-gray-600">{diff.filesChanged} files changed</div>
      {diff.commits.length > 0 && (
        <div>
          <h5 className="text-xs font-semibold uppercase text-gray-500">Commits</h5>
          <ul className="mt-1 space-y-1">
            {diff.commits.map((c) => (
              <li key={c.sha} className="flex gap-2">
                <code className="text-xs text-gray-400">{c.sha.slice(0, 7)}</code>
                <span>{c.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {diff.configChanges.length > 0 && (
        <div>
          <h5 className="text-xs font-semibold uppercase text-gray-500">Config Changes</h5>
          <ul className="mt-1 space-y-1">
            {diff.configChanges.map((c, i) => (
              <li key={i} className="text-gray-600">{c.action}: {c.key}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
