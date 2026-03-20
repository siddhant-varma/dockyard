/**
 * Top navigation bar with service switcher and user info.
 * Shared across all subdomain layouts.
 */

import Link from "next/link";

const SERVICES = [
  { label: "Home", href: "/" },
  { label: "Projects", href: "/projects" },
  { label: "Watchtower", href: "/watchtower" },
];

interface TopbarProps {
  activeService?: string;
  userName?: string | null;
  userImage?: string | null;
}

export function Topbar({ activeService, userName, userImage }: TopbarProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-white/[0.06] bg-white/[0.02] px-4 backdrop-blur-xl dark:glass-elevated">
      <div className="flex items-center gap-1">
        {SERVICES.map((svc) => {
          const isActive =
            activeService === svc.label.toLowerCase() ||
            activeService === svc.href;
          return (
            <Link
              key={svc.href}
              href={svc.href}
              className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                isActive
                  ? "bg-primary/15 font-medium text-primary dark:bg-primary/20 dark:text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/[0.05]"
              }`}
            >
              {svc.label}
            </Link>
          );
        })}
      </div>
      <div className="flex items-center gap-3">
        {userName && (
          <span className="text-sm text-muted-foreground">
            {userName}
          </span>
        )}
        {userImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={userImage}
            alt={userName ?? "User"}
            className="h-8 w-8 rounded-full ring-1 ring-white/10"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.08] text-xs font-medium text-muted-foreground ring-1 ring-white/10">
            {userName?.[0]?.toUpperCase() ?? "?"}
          </div>
        )}
      </div>
    </header>
  );
}
