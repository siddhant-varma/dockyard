import { Topbar } from "@/components/shared/topbar";
import { SubNav, type SubNavItem } from "@/components/shared/sub-nav";
import { auth } from "@/lib/auth";

const SUB_NAV_ITEMS: SubNavItem[] = [
  { label: "Dashboard", href: "/" },
  { label: "Settings", href: "/settings" },
];

export default async function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  return (
    <div className="flex h-screen flex-col">
      <Topbar
        activeService="home"
        userName={session?.user?.name}
        userImage={session?.user?.image}
      />
      <SubNav items={SUB_NAV_ITEMS} />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
