/**
 * MemberManager — client component for managing project memberships.
 *
 * Displays a glass table of current project members with roles, and provides
 * an "Add Member" form for superadmin users. Glass Observatory styling.
 *
 * @param projectSlug - The project's URL slug for API calls.
 * @param isSuperadmin - Whether the current user is a superadmin.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

interface ProjectMember {
  id: string;
  userId: string;
  role: "admin" | "viewer";
  createdAt: string;
  userName: string;
  userEmail: string;
  userImage: string | null;
}

interface MemberManagerProps {
  projectSlug: string;
  isSuperadmin: boolean;
}

const ROLE_STYLES: Record<string, string> = {
  admin: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  viewer: "bg-blue-500/15 text-blue-400 border-blue-500/20",
};

export function MemberManager({
  projectSlug,
  isSuperadmin,
}: MemberManagerProps) {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newUserId, setNewUserId] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "viewer">("viewer");
  const [submitting, setSubmitting] = useState(false);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectSlug}/members`);
      if (!res.ok) throw new Error("Failed to load members");
      const data = (await res.json()) as ProjectMember[];
      setMembers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load members");
    } finally {
      setLoading(false);
    }
  }, [projectSlug]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!newUserId.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectSlug}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: newUserId.trim(), role: newRole }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error: string };
        throw new Error(data.error || "Failed to add member");
      }
      setNewUserId("");
      setNewRole("viewer");
      await fetchMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateRole(userId: string, role: "admin" | "viewer") {
    try {
      const res = await fetch(`/api/projects/${projectSlug}/members`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      if (!res.ok) throw new Error("Failed to update role");
      await fetchMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    }
  }

  async function handleRemoveMember(userId: string) {
    try {
      const res = await fetch(`/api/projects/${projectSlug}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error("Failed to remove member");
      await fetchMembers();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to remove member"
      );
    }
  }

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground/60">
        Loading members...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {members.length === 0 ? (
        <div className="rounded-xl border border-dashed border-glass-border bg-glass-bg p-8 text-center backdrop-blur-sm">
          <p className="text-sm text-muted-foreground/60">
            No project-specific members assigned. Superadmins have universal
            access.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-glass-border bg-glass-bg backdrop-blur-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-glass-border text-left">
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                  User
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                  Role
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                  Added
                </th>
                {isSuperadmin && (
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr
                  key={member.id}
                  className="border-b border-glass-divider last:border-0"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {member.userImage ? (
                        <Image
                          src={member.userImage}
                          alt=""
                          width={28}
                          height={28}
                          className="h-7 w-7 rounded-full"
                        />
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-glass-hover border border-glass-border text-xs text-muted-foreground">
                          {member.userName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-foreground">
                          {member.userName}
                        </div>
                        <div className="text-xs text-muted-foreground/50">
                          {member.userEmail}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {isSuperadmin ? (
                      <select
                        value={member.role}
                        onChange={(e) =>
                          handleUpdateRole(
                            member.userId,
                            e.target.value as "admin" | "viewer"
                          )
                        }
                        className="rounded-lg border border-glass-border bg-glass-input px-2 py-1 text-sm text-foreground backdrop-blur-sm focus:border-[var(--color-brand-500)] focus:outline-none"
                      >
                        <option value="admin">Admin</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    ) : (
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${ROLE_STYLES[member.role] ?? ""}`}
                      >
                        {member.role}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground/60">
                    {new Date(member.createdAt).toLocaleDateString()}
                  </td>
                  {isSuperadmin && (
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleRemoveMember(member.userId)}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors"
                      >
                        Remove
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isSuperadmin && (
        <form
          onSubmit={handleAddMember}
          className="flex flex-col gap-3 rounded-xl border border-glass-border bg-glass-bg p-4 backdrop-blur-sm sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <label
              htmlFor="userId"
              className="block text-xs font-medium text-muted-foreground/70 mb-1"
            >
              User ID
            </label>
            <input
              id="userId"
              type="text"
              value={newUserId}
              onChange={(e) => setNewUserId(e.target.value)}
              placeholder="UUID of the user to add"
              className="w-full rounded-lg border border-glass-border bg-glass-input px-3 py-2 text-sm text-foreground placeholder-muted-foreground/40 backdrop-blur-sm focus:border-[var(--color-brand-500)] focus:outline-none"
              required
            />
          </div>
          <div>
            <label
              htmlFor="role"
              className="block text-xs font-medium text-muted-foreground/70 mb-1"
            >
              Role
            </label>
            <select
              id="role"
              value={newRole}
              onChange={(e) =>
                setNewRole(e.target.value as "admin" | "viewer")
              }
              className="rounded-lg border border-glass-border bg-glass-input px-3 py-2 text-sm text-foreground backdrop-blur-sm focus:border-[var(--color-brand-500)] focus:outline-none"
            >
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-brand-600)] disabled:opacity-50"
          >
            {submitting ? "Adding..." : "Add Member"}
          </button>
        </form>
      )}
    </div>
  );
}
