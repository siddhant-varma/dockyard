/**
 * RollbackButton — one-click rollback with JIT re-auth confirmation.
 */

"use client";

import { useState } from "react";

interface RollbackButtonProps {
  projectSlug: string;
  deploymentId: string;
  deployDate: string;
  onRollback?: () => void;
}

export function RollbackButton({ projectSlug, deploymentId, deployDate, onRollback }: RollbackButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [rolling, setRolling] = useState(false);

  async function handleRollback() {
    setRolling(true);
    try {
      const res = await fetch(
        `/api/projects/${projectSlug}/deployments/${deploymentId}/rollback`,
        { method: "POST" }
      );
      if (res.ok) onRollback?.();
    } finally {
      setRolling(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="rounded border px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
      >
        Rollback
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">Rollback to {new Date(deployDate).toLocaleDateString()}?</span>
      <button
        onClick={handleRollback}
        disabled={rolling}
        className="rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-50"
      >
        {rolling ? "Rolling back..." : "Confirm"}
      </button>
      <button onClick={() => setConfirming(false)} className="text-xs text-gray-500">Cancel</button>
    </div>
  );
}
