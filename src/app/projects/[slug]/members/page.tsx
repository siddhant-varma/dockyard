/**
 * Project Members page — /projects/[slug]/members
 *
 * Server component. Member list with role badges.
 * Matches Stitch "Team Members" section from combined sub-pages wireframe.
 */

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageTabs } from "@/components/layout/page-tabs";
import { buildProjectTabs } from "@/components/projects/project-tabs";
import { isDemoMode } from "@/lib/env";

type Params = Promise<{ slug: string }>;

interface Member {
  name: string;
  email: string;
  role: "owner" | "admin" | "member" | "viewer";
}

const DEMO_MEMBERS: Member[] = [
  { name: "Alex Rivera", email: "alex@dockyard.cc", role: "owner" },
  { name: "Sarah Chen", email: "sarah@dockyard.cc", role: "admin" },
  { name: "Marcus Thorne", email: "marcus@dockyard.cc", role: "member" },
  { name: "Elena Belova", email: "elena@dockyard.cc", role: "viewer" },
];

const ROLE_BADGE: Record<string, string> = {
  owner: "bg-purple-500/20 text-purple-300 border-purple-500/40",
  admin: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  member: "bg-green-500/20 text-green-300 border-green-500/40",
  viewer: "bg-white/10 text-foreground/50 border-white/15",
};

export default async function MembersPage({ params }: { params: Params }) {
  const { slug } = await params;
  const members = isDemoMode ? DEMO_MEMBERS : [];

  return (
    <div className="space-y-6">
      <PageTabs tabs={buildProjectTabs(slug)} />

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Members</h1>
        <Button variant="outline" size="sm" className="text-xs">
          + Invite Member
        </Button>
      </div>

      {members.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center">
          <p className="text-sm text-foreground/50">No members added.</p>
        </div>
      ) : (
        <Card className="bg-card border-glass-border backdrop-blur-lg">
          <CardContent className="divide-y divide-glass-border py-2">
            {members.map((m) => (
              <div
                key={m.email}
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
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
