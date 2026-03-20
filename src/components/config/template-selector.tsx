/**
 * TemplateSelector — dropdown to select and apply config templates.
 *
 * Shows available templates for a project with a "Save Current" button
 * to snapshot the current configuration. Applying a template shows a
 * confirmation dialog before bulk-updating config entries.
 *
 * @param projectSlug - The project's URL slug for API calls.
 * @param onApplied - Callback fired after a template is successfully applied.
 */

"use client";

import { useState, useEffect, useCallback } from "react";

interface Template {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  createdAt: string;
}

interface TemplateSelectorProps {
  projectSlug: string;
  onApplied?: () => void;
}

export function TemplateSelector({
  projectSlug,
  onApplied,
}: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [newName, setNewName] = useState("");
  const [showSave, setShowSave] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/projects/${projectSlug}/config/templates`
      );
      if (res.ok) {
        setTemplates(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, [projectSlug]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  async function handleApply() {
    if (!selectedId) return;
    const template = templates.find((t) => t.id === selectedId);
    if (
      !confirm(`Apply template "${template?.name}"? This will update config entries.`)
    )
      return;

    setApplying(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/projects/${projectSlug}/config/templates`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "apply", templateId: selectedId }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        setMessage(`Applied: ${data.applied} entries updated`);
        onApplied?.();
      } else {
        setMessage(data.error ?? "Failed to apply template");
      }
    } finally {
      setApplying(false);
    }
  }

  async function handleSaveCurrent() {
    if (!newName.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/projects/${projectSlug}/config/templates`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "save_current", name: newName.trim() }),
        }
      );
      if (res.ok) {
        setMessage("Template saved");
        setNewName("");
        setShowSave(false);
        await fetchTemplates();
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        className="rounded border px-3 py-1.5 text-sm"
      >
        <option value="">Select template...</option>
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
            {t.isDefault ? " (default)" : ""}
          </option>
        ))}
      </select>

      <button
        onClick={handleApply}
        disabled={!selectedId || applying}
        className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {applying ? "Applying..." : "Apply"}
      </button>

      {showSave ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Template name"
            className="rounded border px-3 py-1.5 text-sm"
          />
          <button
            onClick={handleSaveCurrent}
            disabled={saving || !newName.trim()}
            className="rounded bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={() => setShowSave(false)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowSave(true)}
          className="rounded border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          Save Current as Template
        </button>
      )}

      {message && (
        <span className="text-sm text-gray-600">{message}</span>
      )}
    </div>
  );
}
