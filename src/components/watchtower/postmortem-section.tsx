"use client";

/**
 * PostmortemSection — interactive postmortem panel for incident detail.
 *
 * If a postmortem already exists, renders it as formatted markdown text.
 * If the incident is resolved (or postmortem status) and no postmortem exists,
 * shows a "Generate Postmortem" button that calls
 * POST /api/incidents/:id/postmortem. The generated draft is editable
 * and can be saved via PUT /api/incidents/:id/postmortem.
 */

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PostmortemSectionProps {
  /** Incident ID used to build API URLs. */
  incidentId: string;
  /** Current incident status. */
  incidentStatus: string;
  /** Existing postmortem content if already generated, or null. */
  existingContent: string | null;
}

export function PostmortemSection({
  incidentId,
  incidentStatus,
  existingContent,
}: PostmortemSectionProps) {
  const [content, setContent] = useState<string | null>(existingContent);
  const [editing, setEditing] = useState(false);
  const [editBuffer, setEditBuffer] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  const canGenerate =
    !content &&
    (incidentStatus === "resolved" || incidentStatus === "postmortem");

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/incidents/${incidentId}/postmortem`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setMessage({
          ok: false,
          text: body.error ?? `Failed (${res.status})`,
        });
        return;
      }
      const data = (await res.json()) as { content: string };
      setContent(data.content);
      setMessage({ ok: true, text: "Draft generated" });
    } catch {
      setMessage({ ok: false, text: "Network error" });
    } finally {
      setGenerating(false);
    }
  }, [incidentId]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/incidents/${incidentId}/postmortem`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editBuffer }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setMessage({
          ok: false,
          text: body.error ?? `Failed (${res.status})`,
        });
        return;
      }
      setContent(editBuffer);
      setEditing(false);
      setMessage({ ok: true, text: "Postmortem saved" });
    } catch {
      setMessage({ ok: false, text: "Network error" });
    } finally {
      setSaving(false);
    }
  }, [incidentId, editBuffer]);

  const startEdit = useCallback(() => {
    setEditBuffer(content ?? "");
    setEditing(true);
    setMessage(null);
  }, [content]);

  return (
    <Card className="bg-card border-glass-border backdrop-blur-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Postmortem</CardTitle>
          {content && !editing && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={startEdit}
            >
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* No postmortem yet — show generate button if applicable */}
        {!content && !generating && (
          <>
            {canGenerate ? (
              <div className="flex flex-col items-start gap-2">
                <p className="text-sm text-foreground/50">
                  No postmortem has been created for this incident.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={handleGenerate}
                >
                  Generate Postmortem
                </Button>
              </div>
            ) : (
              <p className="text-sm text-foreground/40">
                Postmortem can be generated once the incident is resolved.
              </p>
            )}
          </>
        )}

        {/* Loading state */}
        {generating && (
          <p className="text-sm text-foreground/50 animate-pulse">
            Generating postmortem draft...
          </p>
        )}

        {/* Display existing postmortem */}
        {content && !editing && (
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap text-sm leading-relaxed text-foreground/60 font-sans">
            {content}
          </pre>
        )}

        {/* Edit mode */}
        {editing && (
          <div className="space-y-3">
            <textarea
              value={editBuffer}
              onChange={(e) => setEditBuffer(e.target.value)}
              className="w-full min-h-[200px] rounded-md border border-glass-border bg-background/50 p-3 text-sm text-foreground/80 font-mono focus:outline-none focus:ring-1 focus:ring-foreground/20"
            />
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                disabled={saving}
                onClick={handleSave}
              >
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                disabled={saving}
                onClick={() => {
                  setEditing(false);
                  setMessage(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Status message */}
        {message && (
          <p
            className={`mt-2 text-[10px] ${message.ok ? "text-green-400" : "text-red-400"}`}
          >
            {message.text}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
