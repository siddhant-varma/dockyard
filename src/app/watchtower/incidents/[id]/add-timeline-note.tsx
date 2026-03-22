/**
 * AddTimelineNote — client component for adding notes to an incident timeline.
 *
 * Submits to POST /api/incidents/:id/timeline with actor name and note text.
 * Refreshes the page via router.refresh() on success.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AddTimelineNoteProps {
  incidentId: string;
}

const INTERNAL_BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export function AddTimelineNote({ incidentId }: AddTimelineNoteProps) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = note.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      const res = await fetch(
        `${INTERNAL_BASE}/api/incidents/${incidentId}/timeline`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actor: "User",
            action: "comment",
            note: trimmed,
          }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(
          (body as Record<string, string>).error ??
            `Request failed (${res.status})`,
        );
        return;
      }
      setNote("");
      router.refresh();
    } catch {
      alert("Failed to add timeline note.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add a timeline note..."
        className="flex-1 bg-glass-input border-glass-border text-sm"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
      />
      <Button
        variant="outline"
        size="sm"
        className="text-xs"
        disabled={submitting || !note.trim()}
        onClick={handleSubmit}
      >
        {submitting ? "Adding..." : "Add Note"}
      </Button>
    </div>
  );
}
