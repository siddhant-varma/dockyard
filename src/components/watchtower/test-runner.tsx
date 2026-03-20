/**
 * TestRunner — UI for configuring and running smoke tests.
 *
 * Shows test configs with "Run Now" buttons and an "Add Smoke Test" form.
 */

"use client";

import { useState, useEffect } from "react";

interface TestConfig {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  runPostDeploy: boolean;
}

interface TestRunnerProps {
  projectSlug: string;
}

export function TestRunner({ projectSlug }: TestRunnerProps) {
  const [configs, setConfigs] = useState<TestConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch(`/api/projects/${projectSlug}/tests/config`);
      if (cancelled) return;
      if (res.ok) setConfigs(await res.json());
      setLoading(false);
    }
    void load();
    return () => { cancelled = true; };
  }, [projectSlug]);

  async function handleRun(configId: string) {
    setRunning(configId);
    await fetch(`/api/projects/${projectSlug}/tests/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ configId }),
    });
    setRunning(null);
  }

  if (loading) return <div className="text-sm text-gray-500">Loading tests...</div>;

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Smoke Tests</h3>
      {configs.length === 0 ? (
        <p className="text-sm text-gray-500">No smoke tests configured.</p>
      ) : (
        <div className="space-y-2">
          {configs.map((config) => (
            <div key={config.id} className="flex items-center justify-between rounded border p-3">
              <div>
                <span className="text-sm font-medium">{config.name}</span>
                <span className="ml-2 text-xs text-gray-500">{config.type}</span>
                {config.runPostDeploy && (
                  <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-600">post-deploy</span>
                )}
              </div>
              <button
                onClick={() => handleRun(config.id)}
                disabled={running === config.id}
                className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700 disabled:opacity-50"
              >
                {running === config.id ? "Running..." : "Run Now"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
