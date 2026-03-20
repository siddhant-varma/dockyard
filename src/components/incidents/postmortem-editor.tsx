/**
 * PostmortemEditor — Markdown editor for incident post-mortems.
 *
 * Shows editable sections with live preview. Supports saving and publishing.
 */

"use client";

import { useState } from "react";

interface PostmortemEditorProps {
  incidentId: string;
  initialContent: string | null;
  onSave: (content: string) => void;
}

const TEMPLATE = `## Summary
Brief description of what happened.

## Impact
- Duration:
- Users affected:
- Services impacted:

## Root Cause
What caused the incident.

## Detection
How was the incident detected? (alert, user report, monitoring)

## Response
Steps taken to investigate and mitigate.

## Resolution
What fixed the issue.

## Lessons Learned
- What went well:
- What could be improved:

## Action Items
- [ ] Action item 1
- [ ] Action item 2
`;

export function PostmortemEditor({ incidentId: _incidentId, initialContent, onSave }: PostmortemEditorProps) {
  const [content, setContent] = useState(initialContent ?? TEMPLATE);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"edit" | "preview">("edit");

  async function handleSave() {
    setSaving(true);
    try {
      onSave(content);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 border-b">
        <button
          onClick={() => setTab("edit")}
          className={`px-3 py-2 text-sm ${tab === "edit" ? "border-b-2 border-blue-600 font-medium" : "text-gray-500"}`}
        >
          Edit
        </button>
        <button
          onClick={() => setTab("preview")}
          className={`px-3 py-2 text-sm ${tab === "preview" ? "border-b-2 border-blue-600 font-medium" : "text-gray-500"}`}
        >
          Preview
        </button>
      </div>

      {tab === "edit" ? (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="h-96 w-full rounded border p-3 font-mono text-sm"
        />
      ) : (
        <div className="prose prose-sm max-w-none rounded border p-4">
          <pre className="whitespace-pre-wrap text-sm">{content}</pre>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Post-Mortem"}
      </button>
    </div>
  );
}
