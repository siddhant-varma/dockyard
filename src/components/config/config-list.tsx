"use client";

/**
 * ConfigList — displays config entries for a project, grouped by category.
 *
 * Client component. Each entry shows its key, display name, a masked value
 * (click to reveal plaintext for secret entries), description, and an Edit
 * button that surfaces the inline ConfigEditor.
 *
 * @param entries - Array of config entries returned by the masked API response.
 * @param slug    - Project slug used to build API paths for updates.
 */

import { useState } from "react";
import { ConfigEditor } from "@/components/config/config-editor";

interface ConfigEntry {
  id: string;
  key: string;
  value: string;
  isSecret: boolean;
  category: string | null;
  displayName: string | null;
  description: string | null;
  inputType: string;
}

interface ConfigListProps {
  entries: ConfigEntry[];
  slug: string;
}

function groupByCategory(entries: ConfigEntry[]): Map<string, ConfigEntry[]> {
  const map = new Map<string, ConfigEntry[]>();
  for (const entry of entries) {
    const key = entry.category ?? "General";
    const group = map.get(key) ?? [];
    group.push(entry);
    map.set(key, group);
  }
  return map;
}

export function ConfigList({ entries, slug }: ConfigListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [localEntries, setLocalEntries] = useState<ConfigEntry[]>(entries);

  function toggleReveal(id: string) {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSaved(id: string, newValue: string) {
    setLocalEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, value: newValue } : e))
    );
    setEditingId(null);
  }

  const grouped = groupByCategory(localEntries);

  if (localEntries.length === 0) {
    return (
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        No config entries found for this project.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {Array.from(grouped.entries()).map(([category, categoryEntries]) => (
        <div key={category} className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {category}
          </h3>

          <div className="rounded-lg border border-neutral-200 dark:border-neutral-700">
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {categoryEntries.map((entry) => {
                const isEditing = editingId === entry.id;
                const isRevealed = revealedIds.has(entry.id);
                const displayValue =
                  entry.isSecret && !isRevealed ? "••••••••" : entry.value;

                return (
                  <li key={entry.id} className="flex flex-col gap-2 px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                            {entry.displayName ?? entry.key}
                          </span>
                          {entry.isSecret && (
                            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                              secret
                            </span>
                          )}
                        </div>
                        <code className="text-xs text-neutral-500 dark:text-neutral-400">
                          {entry.key}
                        </code>
                      </div>

                      <div className="flex items-center gap-2">
                        {entry.isSecret && (
                          <button
                            type="button"
                            onClick={() => toggleReveal(entry.id)}
                            className="text-xs text-neutral-500 underline hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                          >
                            {isRevealed ? "Hide" : "Reveal"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setEditingId(isEditing ? null : entry.id)
                          }
                          className="rounded-md border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                        >
                          {isEditing ? "Cancel" : "Edit"}
                        </button>
                      </div>
                    </div>

                    <div className="rounded bg-neutral-50 px-3 py-1.5 font-mono text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                      {displayValue || (
                        <span className="italic text-neutral-400">empty</span>
                      )}
                    </div>

                    {entry.description && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {entry.description}
                      </p>
                    )}

                    {isEditing && (
                      <ConfigEditor
                        entryId={entry.id}
                        entryKey={entry.key}
                        currentValue={entry.value}
                        isSecret={entry.isSecret}
                        inputType={entry.inputType}
                        slug={slug}
                        onSaved={(newValue) => handleSaved(entry.id, newValue)}
                        onCancel={() => setEditingId(null)}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}
