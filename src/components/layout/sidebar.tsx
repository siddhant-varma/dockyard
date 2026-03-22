/**
 * Sidebar — left navigation for the DockYard layout shell.
 *
 * Rendered as a sticky flex child inside the frame container, so it
 * stays within the max-width boundary on ultra-wide screens.
 *
 * Desktop (>=640px): 224px sidebar, sticky, full height.
 * Mobile (<640px): bottom tab bar, fixed to viewport bottom.
 *
 * Top section: Home, Projects, Watchtower nav items.
 * Bottom section: Admin, user email, logout.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    label: "Home",
    href: "/",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    label: "Projects",
    href: "/projects",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
      </svg>
    ),
  },
  {
    label: "Watchtower",
    href: "/watchtower",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
] as const;

const SETTINGS_ICON = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
);

interface SidebarProps {
  userName?: string | null;
  userEmail?: string | null;
}

export function Sidebar({ userName, userEmail }: SidebarProps) {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* Desktop sidebar — sticky within the flex container */}
      <aside className="sticky top-0 hidden h-[calc(100vh-3rem)] w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar sm:flex">
        {/* Nav items */}
        <nav className="flex-1 space-y-1 p-3 pt-5">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                }`}
              >
                <span className={active ? "text-sidebar-primary" : "text-sidebar-foreground/60"}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section: Admin + User */}
        <div className="border-t border-sidebar-border p-3">
          <Link
            href="/settings"
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              pathname.startsWith("/settings")
                ? "bg-sidebar-accent text-sidebar-primary"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            }`}
          >
            <span className="text-sidebar-foreground/60">{SETTINGS_ICON}</span>
            Admin
          </Link>

          <div className="mt-2 rounded-lg px-3 py-2">
            <p className="truncate text-xs font-medium text-sidebar-foreground">
              {userName ?? userEmail ?? "Not signed in"}
            </p>
            {userEmail && userName && (
              <p className="truncate text-[10px] text-sidebar-foreground/50">
                {userEmail}
              </p>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile bottom tab bar (<640px) — fixed to bottom, constrained to frame width */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 mx-auto flex max-w-[1600px] items-center justify-around border-t border-sidebar-border bg-sidebar py-2 sm:hidden">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] ${
                active ? "text-sidebar-primary" : "text-sidebar-foreground/60"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
        <Link
          href="/settings"
          className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] ${
            pathname.startsWith("/settings")
              ? "text-sidebar-primary"
              : "text-sidebar-foreground/60"
          }`}
        >
          {SETTINGS_ICON}
          Admin
        </Link>
      </nav>
    </>
  );
}
