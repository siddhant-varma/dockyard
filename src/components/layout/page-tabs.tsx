/**
 * PageTabs — horizontal tab bar rendered as the first element in the canvas.
 *
 * Each route group defines its own tabs. The active tab is determined by
 * the current pathname. Uses shadcn Tabs primitives for accessibility.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface PageTab {
  label: string;
  href: string;
}

interface PageTabsProps {
  tabs: PageTab[];
}

export function PageTabs({ tabs }: PageTabsProps) {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    if (href === "/" || href === "") return pathname === "/" || pathname === "";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <div className="mb-6 border-b border-glass-border">
      <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Page tabs">
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative whitespace-nowrap px-4 pb-3 pt-1 text-sm font-medium transition-colors ${
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground/80"
              }`}
            >
              {tab.label}
              {active && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-brand-500)]" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
