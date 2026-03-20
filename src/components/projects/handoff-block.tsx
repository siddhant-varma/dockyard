/**
 * HandoffBlock — generates and copies AI-agent-consumable context to clipboard.
 *
 * "Copy Context for AI Agent" button that fetches the handoff block,
 * shows a preview modal, and copies to clipboard. Displays the
 * validation hash for integrity verification.
 *
 * @param projectSlug - The project's URL slug for API calls.
 */

"use client";

import { useState } from "react";

interface HandoffBlockProps {
  projectSlug: string;
}

export function HandoffBlock({ projectSlug }: HandoffBlockProps) {
  const [content, setContent] = useState<string | null>(null);
  const [format, setFormat] = useState<"json" | "markdown">("markdown");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/projects/${projectSlug}/handoff?format=${format}`
      );
      const text = format === "markdown" ? await res.text() : JSON.stringify(await res.json(), null, 2);
      setContent(text);
      setShowPreview(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!content) return;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value as "json" | "markdown")}
          className="rounded border px-2 py-1.5 text-sm"
        >
          <option value="markdown">Markdown</option>
          <option value="json">JSON</option>
        </select>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="rounded bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "Generating..." : "Copy Context for AI Agent"}
        </button>
      </div>

      {showPreview && content && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 max-h-[80vh] w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="font-semibold">Context Handoff Block</h3>
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
                <button
                  onClick={() => setShowPreview(false)}
                  className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
            <pre className="max-h-[65vh] overflow-auto p-4 text-xs">
              {content}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
