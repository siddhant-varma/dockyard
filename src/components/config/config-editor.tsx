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
    <div className="flex flex-col gap-2 rounded-md border border-glass-border bg-glass-bg p-3">
      <input
        type={resolvedInputType}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError(null);
        }}
        autoFocus
        className="w-full rounded-md border border-glass-border-strong bg-glass-input px-3 py-1.5 font-mono text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
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
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-md border border-glass-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-glass-hover"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
