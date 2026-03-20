"use client";

/**
 * Horizontal sub-navigation tabs displayed below the Topbar.
 * Each route group provides its own tab items via props.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface SubNavItem {
  label: string;
  href: string;
}

interface SubNavProps {
  items: SubNavItem[];
}

export function SubNav({ items }: SubNavProps) {
  const pathname = usePathname();

  if (items.length === 0) return null;

  return (
    <nav className="flex gap-1 border-b border-neutral-200 bg-white px-4 dark:border-neutral-800 dark:bg-neutral-950">
      {items.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/" && pathname.startsWith(item.href + "/"));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative px-3 py-2.5 text-sm transition-colors ${
              isActive
                ? "font-medium text-neutral-900 dark:text-neutral-100"
                : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
            }`}
          >
            {item.label}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900 dark:bg-neutral-100" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
