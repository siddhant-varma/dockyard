/**
 * Projects settings tab — manage discovered and manual projects.
 *
 * Fetches the project list from GET /api/projects and displays
 * name, discovery source, and status with Edit/Disable/Delete actions.
 * Supports manual project creation via an inline form.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Project {
  id: string;
  name: string;
  slug: string;
  description?: string;
  discoveredVia?: string;
  status?: string;
  githubRepo?: string;
  localPath?: string;
  techStack?: string[];
}

const STATUS_OPTIONS = [
  "discovered",
  "active",
  "paused",
  "completed",
  "archived",
] as const;

export function ProjectsTab() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Add project form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState("");
  const [addSlug, setAddSlug] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addGithubRepo, setAddGithubRepo] = useState("");
  const [addLocalPath, setAddLocalPath] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit state
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      if (!res.ok) {
        setFetchError("Failed to load projects");
        return;
      }
      const data = await res.json();
      // API returns array directly from listProjects()
      setProjects(Array.isArray(data) ? data : []);
    } catch {
      setFetchError("Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  /** Generate a URL-safe slug from a name. */
  const slugify = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const handleAddProject = async () => {
    setAddError(null);
    const name = addName.trim();
    const slug = addSlug.trim() || slugify(name);

    if (!name) {
      setAddError("Project name is required.");
      return;
    }
    if (!slug) {
      setAddError("Slug is required.");
      return;
    }

    setAdding(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          description: addDescription.trim() || undefined,
          githubRepo: addGithubRepo.trim() || undefined,
          localPath: addLocalPath.trim() || undefined,
          discoveredVia: "manual",
        }),
      });

      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ error: "Failed to create project" }));
        setAddError(err.error ?? "Failed to create project");
        return;
      }

      // Reset form and refresh
      setShowAddForm(false);
      setAddName("");
      setAddSlug("");
      setAddDescription("");
      setAddGithubRepo("");
      setAddLocalPath("");
      await fetchProjects();
    } catch {
      setAddError("Network error — check your connection");
    } finally {
      setAdding(false);
    }
  };

  const handleStartEdit = (p: Project) => {
    setEditingSlug(p.slug);
    setEditName(p.name);
    setEditDescription(p.description ?? "");
    setEditStatus(p.status ?? "discovered");
  };

  const handleSaveEdit = async () => {
    if (!editingSlug) return;
    setSaving(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/projects/${editingSlug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || undefined,
          status: editStatus,
        }),
      });
      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ error: "Failed to update" }));
        setActionError(err.error ?? "Failed to update project");
        return;
      }
      setEditingSlug(null);
      await fetchProjects();
    } catch {
      setActionError("Network error — check your connection");
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (slug: string, name: string) => {
    const confirmed = window.confirm(
      `Archive "${name}"? It can be restored later.`
    );
    if (!confirmed) return;
    setActionError(null);
    try {
      const res = await fetch(`/api/projects/${slug}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ error: "Failed to archive" }));
        setActionError(err.error ?? "Failed to archive project");
        return;
      }
      await fetchProjects();
    } catch {
      setActionError("Network error — check your connection");
    }
  };

  const handleToggleStatus = async (slug: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    setActionError(null);
    try {
      const res = await fetch(`/api/projects/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ error: "Failed to update status" }));
        setActionError(err.error ?? "Failed to update status");
        return;
      }
      await fetchProjects();
    } catch {
      setActionError("Network error — check your connection");
    }
  };

  const statusColor = (status?: string) => {
    switch (status) {
      case "active":
        return "text-emerald-400";
      case "paused":
        return "text-amber-400";
      case "archived":
        return "text-foreground/30";
      case "completed":
        return "text-blue-400";
      default:
        return "text-foreground/50";
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-card border-glass-border backdrop-blur-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Projects</CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setShowAddForm((prev) => !prev)}
            >
              {showAddForm ? "Cancel" : "+ Add Project"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {fetchError && (
            <div className="mb-3 rounded-md border border-red-500/30 bg-red-500/5 p-3">
              <p className="text-xs text-red-400">{fetchError}</p>
            </div>
          )}
          {actionError && (
            <div className="mb-3 rounded-md border border-red-500/30 bg-red-500/5 p-3">
              <p className="text-xs text-red-400">{actionError}</p>
            </div>
          )}
          {loading ? (
            <p className="text-xs text-foreground/40">Loading...</p>
          ) : projects.length === 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-foreground/40">
                No projects discovered yet. Run a scan from the Sources tab or
                add a project manually.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {projects.map((p) => (
                <div
                  key={p.slug}
                  className={`rounded-lg border border-glass-border bg-card/50 p-3 ${
                    p.status === "archived" ? "opacity-50" : ""
                  }`}
                >
                  {editingSlug === p.slug ? (
                    /* ── Edit Mode ── */
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-foreground/60">
                            Name
                          </Label>
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="bg-glass-input border-glass-border text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-foreground/60">
                            Status
                          </Label>
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value)}
                            className="w-full rounded-md border border-glass-border bg-glass-input px-3 py-2 text-sm text-foreground"
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-foreground/60">
                          Description
                        </Label>
                        <Input
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="bg-glass-input border-glass-border text-sm"
                          placeholder="Optional description"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="text-xs"
                          onClick={handleSaveEdit}
                          disabled={saving}
                        >
                          {saving ? "Saving..." : "Save"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={() => setEditingSlug(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* ── View Mode ── */
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground/80 truncate">
                          {p.name}
                        </p>
                        <p className="text-xs text-foreground/40">
                          {p.discoveredVia ?? "manual"}
                          {p.githubRepo ? ` · ${p.githubRepo}` : ""}
                          {p.localPath ? ` · ${p.localPath}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-xs font-medium capitalize ${statusColor(p.status)}`}
                        >
                          {p.status ?? "discovered"}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-foreground/50"
                          onClick={() => handleStartEdit(p)}
                        >
                          Edit
                        </Button>
                        {p.status !== "archived" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`text-xs ${p.status === "active" ? "text-amber-400" : "text-emerald-400"}`}
                            onClick={() =>
                              handleToggleStatus(
                                p.slug,
                                p.status ?? "discovered"
                              )
                            }
                          >
                            {p.status === "active" ? "Pause" : "Activate"}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-red-400"
                          onClick={() => handleArchive(p.slug, p.name)}
                        >
                          Archive
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showAddForm && (
        <Card className="bg-card border-glass-border backdrop-blur-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Add Project Manually</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-foreground/60">
                  Project Name *
                </Label>
                <Input
                  value={addName}
                  onChange={(e) => {
                    setAddName(e.target.value);
                    if (!addSlug) setAddSlug(slugify(e.target.value));
                  }}
                  placeholder="My Project"
                  className="bg-glass-input border-glass-border text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-foreground/60">Slug</Label>
                <Input
                  value={addSlug}
                  onChange={(e) => setAddSlug(e.target.value)}
                  placeholder={addName ? slugify(addName) : "my-project"}
                  className="bg-glass-input border-glass-border text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-foreground/60">Description</Label>
              <Input
                value={addDescription}
                onChange={(e) => setAddDescription(e.target.value)}
                placeholder="What this project does"
                className="bg-glass-input border-glass-border text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-foreground/60">
                  GitHub Repo
                </Label>
                <Input
                  value={addGithubRepo}
                  onChange={(e) => setAddGithubRepo(e.target.value)}
                  placeholder="owner/repo"
                  className="bg-glass-input border-glass-border text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-foreground/60">Local Path</Label>
                <Input
                  value={addLocalPath}
                  onChange={(e) => setAddLocalPath(e.target.value)}
                  placeholder="/home/user/projects/my-project"
                  className="bg-glass-input border-glass-border text-sm"
                />
              </div>
            </div>

            {addError && <p className="text-xs text-red-400">{addError}</p>}

            <Button
              size="sm"
              className="text-xs"
              onClick={handleAddProject}
              disabled={adding}
            >
              {adding ? "Adding..." : "Add Project"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
