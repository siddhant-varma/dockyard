"use client";

/**
 * ConfigEditor — inline edit form for a single config entry.
 *
 * Client component. Renders a text or password input and a Save button.
 * On save, calls PUT /api/projects/[slug]/config/[id] with the new value.
 * Calls onSaved with the updated value on success, or onCancel on dismiss.
 *
 * @param entryId      - UUID of the config entry to update.
 * @param entryKey     - Config key name (passed to the API alongside value).
 * @param currentValue - Pre-filled initial value shown in the input.
 * @param isSecret     - When true, renders a password input.
 * @param inputType    - The stored inputType hint ("text" | "password" | etc.).
 * @param slug         - Project URL slug for building the API path.
 * @param onSaved      - Callback invoked with the new plaintext value on success.
 * @param onCancel     - Callback invoked when the user dismisses without saving.
 */

import { useState } from "react";

interface ConfigEditorProps {
  entryId: string;
  entryKey: string;
  currentValue: string;
  isSecret: boolean;
  inputType: string;
  slug: string;
  onSaved: (newValue: string) => void;
  onCancel: () => void;
}

export function ConfigEditor({
  entryId,
  entryKey,
  currentValue,
  isSecret,
  inputType,
  slug,
  onSaved,
  onCancel,
}: ConfigEditorProps) {
  const [value, setValue] = useState(currentValue);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolvedInputType =
    isSecret || inputType === "password" ? "password" : "text";

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${slug}/config/${entryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: entryKey, value }),
      });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      onSaved(value);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800/50">
      <input
        type={resolvedInputType}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError(null);
        }}
        autoFocus
        className="w-full rounded-md border border-neutral-200 bg-white px-3 py-1.5 font-mono text-sm text-neutral-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
        aria-label={`Value for ${entryKey}`}
      />

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neutral-700 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
