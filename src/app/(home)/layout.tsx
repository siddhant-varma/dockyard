import { TopbarGlass } from "@/components/dashboard/topbar-glass";
import { auth } from "@/lib/auth";

export default async function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  return (
    <div className="flex h-screen flex-col">
      <TopbarGlass
        activeService="home"
        userName={session?.user?.name}
        userImage={session?.user?.image}
      />
      <main className="flex-1 overflow-y-auto p-6 canvas">{children}</main>
    </div>
  );
}
