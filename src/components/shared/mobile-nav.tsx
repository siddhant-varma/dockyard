"use client";

/**
 * Mobile bottom navigation bar — matches Stitch Mobile Dashboard wireframe.
 *
 * Fixed bottom bar with 3 icon tabs: Home, Projects (Monitoring), Settings.
 * Only visible on mobile viewports (hidden on md+ via CSS).
 * Uses the current pathname to highlight the active tab.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Layers, Settings } from "lucide-react";

const NAV_ITEMS = [
  { label: "Home", href: "/", icon: Home },
  { label: "Monitoring", href: "/watchtower", icon: Layers },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-center justify-around border-t border-glass-border bg-glass-bg backdrop-blur-xl md:hidden">
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 px-4 py-1 transition-colors ${
              isActive
                ? "text-primary"
                : "text-muted-foreground"
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
