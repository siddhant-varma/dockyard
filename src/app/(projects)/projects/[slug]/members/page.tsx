/**
 * Project members page — /projects/[slug]/members
 *
 * Wires the MemberManager component into the project tab navigation.
 * Fetches current user session to determine superadmin status.
 */

import { auth } from "@/lib/auth";
import { MemberManager } from "@/components/projects/member-manager";

type Params = Promise<{ slug: string }>;

export default async function MembersPage({ params }: { params: Params }) {
  const { slug } = await params;
  const session = await auth();
  const isSuperadmin = session?.user?.role === "superadmin";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Team Members</h1>
        <p className="mt-0.5 text-sm text-muted-foreground/70">
          Manage who has access to this project and their roles.
        </p>
      </div>
      <MemberManager projectSlug={slug} isSuperadmin={isSuperadmin} />
    </div>
  );
}
