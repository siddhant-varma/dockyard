/**
 * MemberManager — client component for managing project memberships.
 *
 * Displays a table of current project members with their roles, and provides
 * an "Add Member" form for superadmin users. Only superadmins can see the
 * add/remove/update controls; project admins and viewers see a read-only list.
 *
 * Renders within the project detail page's settings section.
 *
 * @param projectSlug - The project's URL slug for API calls.
 * @param isSuperadmin - Whether the current user is a superadmin.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

/** A project member as returned by GET /api/projects/:slug/members. */
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
      setError(err instanceof Error ? err.message : "Failed to remove member");
    }
  }

  if (loading) {
    return <div className="text-sm text-gray-500">Loading members...</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Project Members</h3>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {members.length === 0 ? (
        <p className="text-sm text-gray-500">
          No project-specific members assigned. Superadmins have universal
          access.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2 font-medium">User</th>
              <th className="pb-2 font-medium">Role</th>
              <th className="pb-2 font-medium">Added</th>
              {isSuperadmin && (
                <th className="pb-2 font-medium">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id} className="border-b">
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    {member.userImage && (
                      <Image
                        src={member.userImage}
                        alt=""
                        width={24}
                        height={24}
                        className="h-6 w-6 rounded-full"
                      />
                    )}
                    <div>
                      <div className="font-medium">{member.userName}</div>
                      <div className="text-xs text-gray-500">
                        {member.userEmail}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-2">
                  {isSuperadmin ? (
                    <select
                      value={member.role}
                      onChange={(e) =>
                        handleUpdateRole(
                          member.userId,
                          e.target.value as "admin" | "viewer"
                        )
                      }
                      className="rounded border px-2 py-1 text-sm"
                    >
                      <option value="admin">Admin</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  ) : (
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium capitalize">
                      {member.role}
                    </span>
                  )}
                </td>
                <td className="py-2 text-gray-500">
                  {new Date(member.createdAt).toLocaleDateString()}
                </td>
                {isSuperadmin && (
                  <td className="py-2">
                    <button
                      onClick={() => handleRemoveMember(member.userId)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {isSuperadmin && (
        <form onSubmit={handleAddMember} className="flex items-end gap-3">
          <div className="flex-1">
            <label
              htmlFor="userId"
              className="block text-sm font-medium text-gray-700"
            >
              User ID
            </label>
            <input
              id="userId"
              type="text"
              value={newUserId}
              onChange={(e) => setNewUserId(e.target.value)}
              placeholder="UUID of the user to add"
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label
              htmlFor="role"
              className="block text-sm font-medium text-gray-700"
            >
              Role
            </label>
            <select
              id="role"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as "admin" | "viewer")}
              className="mt-1 rounded border px-3 py-2 text-sm"
            >
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Adding..." : "Add Member"}
          </button>
        </form>
      )}
    </div>
  );
}
