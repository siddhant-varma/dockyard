/**
 * HeaderBar — top header for the DockYard layout shell.
 *
 * The brand sits in a left column matching the sidebar width (w-56),
 * so "DockYard" aligns vertically with the sidebar nav items below.
 * Uses plain <img> for the brand icon — bypasses next/image optimization
 * so it works reliably on all deploy targets (Dokploy, static, etc.).
 */

import Link from "next/link";

export function HeaderBar() {
  return (
    <header className="flex h-12 items-center border-b border-sidebar-border bg-[#0d1320]">
      {/* Left column — matches sidebar width, brand inside */}
      <div className="hidden sm:flex w-56 shrink-0 items-center gap-2 px-4">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/favicon-32.png"
            alt="DockYard"
            width={24}
            height={24}
            className="rounded"
          />
          <span className="text-base font-semibold text-foreground">
            DockYard
          </span>
        </Link>
      </div>

      {/* Mobile brand — visible only on small screens */}
      <div className="flex sm:hidden items-center gap-2 px-4">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/favicon-32.png"
            alt="DockYard"
            width={24}
            height={24}
            className="rounded"
          />
          <span className="text-base font-semibold text-foreground">
            DockYard
          </span>
        </Link>
      </div>

      {/* Right area — external links + version, pushed to the right */}
      <div className="ml-auto flex items-center gap-4 px-6 text-xs text-muted-foreground">
        <a
          href="https://github.com/siddhant-varma/DockYard"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-foreground"
        >
          GitHub
        </a>
        <span className="rounded border border-sidebar-border px-1.5 py-0.5 text-[10px] text-muted-foreground/60">
          v0.2.0
        </span>
      </div>
    </header>
  );
}
