/**
 * Project Members page — /projects/[slug]/members
 *
 * Server component. Fetches member list from backend API (or demo data).
 * Delegates interactive actions (invite, remove) to the MemberList client component.
 * Matches Stitch "Team Members" section from combined sub-pages wireframe.
 */

import { PageTabs } from "@/components/layout/page-tabs";
import { buildProjectTabs } from "@/components/projects/project-tabs";
import { isDemoMode } from "@/lib/env";
import { MemberList } from "./member-list";

type Params = Promise<{ slug: string }>;

interface Member {
  id?: string;
  userId?: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "member" | "viewer";
}

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

const DEMO_MEMBERS: Member[] = [
  { name: "Alex Rivera", email: "alex@dockyard.cc", role: "owner" },
  { name: "Sarah Chen", email: "sarah@dockyard.cc", role: "admin" },
  { name: "Marcus Thorne", email: "marcus@dockyard.cc", role: "member" },
  { name: "Elena Belova", email: "elena@dockyard.cc", role: "viewer" },
];

const INTERNAL_BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

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

/** Fetch members from the backend or return demo data. */
async function fetchMembers(slug: string): Promise<Member[]> {
  if (isDemoMode) return DEMO_MEMBERS;
  try {
    const res = await fetch(
      `${INTERNAL_BASE}/api/projects/${slug}/members`,
      { cache: "no-store" },
    );
    if (!res.ok) return [];
    const data: ApiMember[] = await res.json();
    return data.map(toMember);
  } catch {
    return [];
  }
}

export default async function MembersPage({ params }: { params: Params }) {
  const { slug } = await params;
  const members = await fetchMembers(slug);

  return (
    <div className="space-y-6">
      <PageTabs tabs={buildProjectTabs(slug)} />
      <MemberList slug={slug} initialMembers={members} isDemo={isDemoMode} />
    </div>
  );
}
