/**
 * MemberList — interactive client component for the members page.
 *
 * Renders the member grid with role badges and provides
 * "Invite Member" (POST) and "Remove" (DELETE) actions
 * against /api/projects/:slug/members.
 *
 * In demo mode, buttons are visible but mutations are disabled.
 */

"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";

interface Member {
  id?: string;
  userId?: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "member" | "viewer";
}

interface MemberListProps {
  slug: string;
  initialMembers: Member[];
  isDemo: boolean;
}

const ROLE_BADGE: Record<string, string> = {
  owner: "bg-purple-500/20 text-purple-300 border-purple-500/40",
  admin: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  member: "bg-green-500/20 text-green-300 border-green-500/40",
  viewer: "bg-white/10 text-foreground/50 border-white/15",
};

const INTERNAL_BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Shape returned by GET /api/projects/:slug/members */
interface ApiMember {
  id: string;
  userId: string;
  role: string;
  createdAt: string;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
}

/** Map an API member response to the local Member shape. */
function toMember(api: ApiMember): Member {
  return {
    id: api.id,
    userId: api.userId,
    name: api.userName ?? "Unknown",
    email: api.userEmail ?? "",
    role: api.role as Member["role"],
  };
}

export function MemberList({ slug, initialMembers, isDemo }: MemberListProps) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [removing, setRemoving] = useState<string | null>(null);

  /** Refetch the member list from the API. */
  const refetch = useCallback(async () => {
    if (isDemo) return;
    try {
      const res = await fetch(
        `${INTERNAL_BASE}/api/projects/${slug}/members`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const data: ApiMember[] = await res.json();
      setMembers(data.map(toMember));
    } catch {
      // Keep existing data on failure
    }
  }, [slug, isDemo]);

  /** Invite a member via POST /api/projects/:slug/members. */
  const handleInvite = async () => {
    if (isDemo) return;
    const userId = prompt("Enter the user ID (UUID) to invite:");
    if (!userId) return;
    const role = prompt("Enter role (admin or viewer):");
    if (role !== "admin" && role !== "viewer") {
      alert("Role must be 'admin' or 'viewer'.");
      return;
    }
    try {
      const res = await fetch(
        `${INTERNAL_BASE}/api/projects/${slug}/members`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, role }),
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
      await refetch();
    } catch {
      alert("Failed to invite member.");
    }
  };

  /** Remove a member via DELETE /api/projects/:slug/members. */
  const handleRemove = async (member: Member) => {
    if (isDemo || !member.userId) return;
    if (!confirm(`Remove ${member.name} from this project?`)) return;
    setRemoving(member.userId);
    try {
      const res = await fetch(
        `${INTERNAL_BASE}/api/projects/${slug}/members`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: member.userId }),
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
      await refetch();
    } catch {
      alert("Failed to remove member.");
    } finally {
      setRemoving(null);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Members</h1>
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={handleInvite}
          disabled={isDemo}
        >
          + Invite Member
        </Button>
      </div>

      {members.length === 0 ? (
        <EmptyState
          icon="folder"
          title="No members added"
          description="Invite team members to collaborate on this project."
        />
      ) : (
        <Card className="bg-card border-glass-border backdrop-blur-lg">
          <CardContent className="divide-y divide-glass-border py-2">
            {members.map((m) => (
              <div
                key={m.email || m.userId}
                className="flex items-center justify-between py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-xs font-medium text-foreground/50">
                    {m.name[0]}
                  </div>
                  <div>
                    <p className="text-sm text-foreground/80">{m.name}</p>
                    <p className="text-xs text-foreground/40">{m.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`text-[10px] capitalize ${ROLE_BADGE[m.role]}`}
                  >
                    {m.role}
                  </Badge>
                  {m.role !== "owner" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-red-400"
                      disabled={isDemo || removing === m.userId}
                      onClick={() => handleRemove(m)}
                    >
                      {removing === m.userId ? "Removing..." : "Remove"}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </>
  );
}
