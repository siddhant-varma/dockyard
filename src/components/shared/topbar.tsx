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
    <header className="flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-4 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex items-center gap-1">
        {SERVICES.map((svc) => {
          const isActive =
            activeService === svc.label.toLowerCase() ||
            activeService === svc.href;
          return (
            <Link
              key={svc.href}
              href={svc.href}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                isActive
                  ? "bg-neutral-100 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                  : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
              }`}
            >
              {svc.label}
            </Link>
          );
        })}
      </div>
      <div className="flex items-center gap-3">
        {userName && (
          <span className="text-sm text-neutral-600 dark:text-neutral-400">
            {userName}
          </span>
        )}
        {userImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={userImage}
            alt={userName ?? "User"}
            className="h-8 w-8 rounded-full"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-200 text-xs font-medium text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
            {userName?.[0]?.toUpperCase() ?? "?"}
          </div>
        )}
      </div>
    </header>
  );
}
