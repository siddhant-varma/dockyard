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

import { useState, useCallback } from "react";
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

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  database: "Database",
  ai_provider: "AI Provider",
  auth: "Authentication",
  storage: "Storage",
  monitoring: "Monitoring",
  custom: "Custom",
};

export function ConfigList({ entries, slug }: ConfigListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [localEntries, setLocalEntries] = useState<ConfigEntry[]>(entries);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = useCallback((category: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }, []);

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
      <p className="text-sm text-muted-foreground">
        No config entries found for this project.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {Array.from(grouped.entries()).map(([category, categoryEntries]) => {
        const isCollapsed = collapsedCategories.has(category);
        const label = CATEGORY_LABELS[category] ?? category;

        return (
        <div key={category} className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => toggleCategory(category)}
            className="flex items-center gap-2 text-left"
          >
            <span className="text-xs text-muted-foreground/60">{isCollapsed ? "▸" : "▾"}</span>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {label}
            </h3>
            <span className="rounded-full bg-glass-hover px-2 py-0.5 text-xs text-muted-foreground">
              {categoryEntries.length}
            </span>
          </button>

          {!isCollapsed && (
          <div className="rounded-xl border border-glass-border">
            <ul className="divide-y divide-glass-divider">
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
                          <span className="text-sm font-medium text-foreground">
                            {entry.displayName ?? entry.key}
                          </span>
                          {entry.isSecret && (
                            <span className="rounded-full bg-glass-hover px-2 py-0.5 text-xs text-muted-foreground">
                              secret
                            </span>
                          )}
                        </div>
                        <code className="text-xs text-muted-foreground">
                          {entry.key}
                        </code>
                      </div>

                      <div className="flex items-center gap-2">
                        {entry.isSecret && (
                          <button
                            type="button"
                            onClick={() => toggleReveal(entry.id)}
                            className="text-xs text-muted-foreground underline hover:text-foreground/90"
                          >
                            {isRevealed ? "Hide" : "Reveal"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setEditingId(isEditing ? null : entry.id)
                          }
                          className="rounded-md border border-glass-border px-3 py-1 text-xs font-medium text-foreground/80 hover:bg-glass-hover"
                        >
                          {isEditing ? "Cancel" : "Edit"}
                        </button>
                      </div>
                    </div>

                    <div className="rounded bg-glass-bg px-3 py-1.5 font-mono text-xs text-foreground/80">
                      {displayValue || (
                        <span className="italic text-muted-foreground/60">empty</span>
                      )}
                    </div>

                    {entry.description && (
                      <p className="text-xs text-muted-foreground">
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
          )}
        </div>
        );
      })}
    </div>
  );
}
