"use client";

import { useState } from "react";

interface PlatformSettings {
  operatingMode: string;
  autoScan: boolean;
  scanInterval: number;
}

export function GeneralTab({ initial }: { initial: PlatformSettings }) {
  const [settings, setSettings] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Operating Mode
        </label>
        <select
          value={settings.operatingMode}
          onChange={(e) =>
            setSettings({ ...settings, operatingMode: e.target.value })
          }
          className="mt-1 block w-48 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
        >
          <option value="local">Local Development</option>
          <option value="vps">VPS / Deployed</option>
        </select>
        <p className="mt-1 text-xs text-neutral-500">
          Local mode scans the filesystem. VPS mode uses Dokploy + GitHub.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="autoScan"
          checked={settings.autoScan}
          onChange={(e) =>
            setSettings({ ...settings, autoScan: e.target.checked })
          }
          className="h-4 w-4 rounded border-neutral-300"
        />
        <label
          htmlFor="autoScan"
          className="text-sm text-neutral-700 dark:text-neutral-300"
        >
          Enable automatic periodic scanning
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Scan Interval (seconds)
        </label>
        <input
          type="number"
          min={30}
          value={settings.scanInterval}
          onChange={(e) =>
            setSettings({
              ...settings,
              scanInterval: parseInt(e.target.value) || 300,
            })
          }
          className="mt-1 block w-32 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Settings"}
      </button>
    </div>
  );
}
