import { TopbarGlass } from "@/components/dashboard/topbar-glass";
import { SubNav, type SubNavItem } from "@/components/shared/sub-nav";
import { auth } from "@/lib/auth";

const SUB_NAV_ITEMS: SubNavItem[] = [
  { label: "Overview", href: "/watchtower" },
  { label: "Alerts", href: "/watchtower/alerts" },
  { label: "Incidents", href: "/watchtower/incidents" },
];

export default async function WatchtowerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  return (
    <div className="flex h-screen flex-col">
      <TopbarGlass
        activeService="watchtower"
        userName={session?.user?.name}
        userImage={session?.user?.image}
      />
      <SubNav items={SUB_NAV_ITEMS} />
      <main className="canvas flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
