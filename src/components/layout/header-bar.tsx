/**
 * HeaderBar — top header for the DockYard layout shell.
 *
 * The brand sits in a left column matching the sidebar width (w-56),
 * so "DockYard" aligns vertically with the sidebar nav items below.
 * Brand icon is inlined as base64 data URI to bypass Next.js standalone
 * mode limitation where public/ files are not served by server.js.
 */

import Link from "next/link";

/** Brand icon (32x32 PNG) as data URI — works in standalone mode without static file serving. */
const BRAND_ICON =
  "data:image/png;base64,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";

export function HeaderBar() {
  return (
    <header className="flex h-12 items-center border-b border-sidebar-border bg-[#0d1320]">
      {/* Left column — matches sidebar width, brand inside */}
      <div className="hidden sm:flex w-56 shrink-0 items-center gap-2 px-4">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={BRAND_ICON}
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
            src={BRAND_ICON}
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
