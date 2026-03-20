/**
 * AutoRollbackToggle — toggle for enabling/disabling auto-rollback.
 *
 * Displays a switch to toggle auto-rollback, a configurable health check
 * timeout, and the count of past rollback events. Includes a tooltip
 * explaining the feature.
 *
 * @param projectSlug - The project's URL slug for API calls.
 */

"use client";

import { useState, useEffect, useCallback } from "react";

interface RollbackState {
  enabled: boolean;
  healthCheckTimeoutSecs: number;
  rollbackCount: number;
}

interface AutoRollbackToggleProps {
  projectSlug: string;
}

export function AutoRollbackToggle({ projectSlug }: AutoRollbackToggleProps) {
  const [state, setState] = useState<RollbackState | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchConfig = useCallback(async () => {
    const res = await fetch(
      `/api/projects/${projectSlug}/config/rollback`
    );
    if (res.ok) {
      setState(await res.json());
    }
  }, [projectSlug]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  async function handleToggle() {
    if (!state) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/projects/${projectSlug}/config/rollback`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            enabled: !state.enabled,
            healthCheckTimeoutSecs: state.healthCheckTimeoutSecs,
          }),
        }
      );
      if (res.ok) {
        setState({ ...state, enabled: !state.enabled });
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleTimeoutChange(secs: number) {
    if (!state) return;
    const res = await fetch(
      `/api/projects/${projectSlug}/config/rollback`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: state.enabled,
          healthCheckTimeoutSecs: secs,
        }),
      }
    );
    if (res.ok) {
      setState({ ...state, healthCheckTimeoutSecs: secs });
    }
  }

  if (!state) return null;

  return (
    <div className="flex items-center gap-4 rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleToggle}
          disabled={saving}
          className={`relative h-6 w-11 rounded-full transition-colors ${
            state.enabled ? "bg-blue-600" : "bg-gray-300"
          } ${saving ? "opacity-50" : ""}`}
          title="When enabled, config changes that cause a failed deploy will be automatically reverted"
        >
          <span
            className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
              state.enabled ? "translate-x-5" : ""
            }`}
          />
        </button>
        <span className="text-sm font-medium">Auto-Rollback</span>
      </div>

      {state.enabled && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <label htmlFor="timeout">Timeout:</label>
          <select
            id="timeout"
            value={state.healthCheckTimeoutSecs}
            onChange={(e) => handleTimeoutChange(Number(e.target.value))}
            className="rounded border px-2 py-1 text-xs"
          >
            <option value={30}>30s</option>
            <option value={60}>60s</option>
            <option value={120}>2m</option>
            <option value={300}>5m</option>
          </select>
        </div>
      )}

      {state.rollbackCount > 0 && (
        <span className="text-xs text-gray-500">
          {state.rollbackCount} rollback{state.rollbackCount !== 1 ? "s" : ""} recorded
        </span>
      )}
    </div>
  );
}
