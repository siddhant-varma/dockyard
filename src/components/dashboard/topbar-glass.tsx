"use client";

/**
 * Glass Observatory topbar — full navigation with notifications and user menu.
 *
 * Matches the Stitch "DockYard Glass Dashboard" wireframe:
 * - Logo/brand text on the left
 * - Nav links (Home, Projects, Watchtower) as pill tabs
 * - Right side: notification bell, user avatar with dropdown (Settings, Support, Logout)
 *
 * Uses glass-elevated surface treatment with backdrop-blur.
 */

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { Bell, Settings, HelpCircle, LogOut } from "lucide-react";

const SERVICES = [
  { label: "Home", href: "/" },
  { label: "Projects", href: "/projects" },
  { label: "Watchtower", href: "/watchtower" },
];

interface TopbarGlassProps {
  activeService?: string;
  userName?: string | null;
  userImage?: string | null;
}

export function TopbarGlass({ activeService, userName, userImage }: TopbarGlassProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  return (
    <header className="flex h-14 items-center justify-between border-b border-glass-border bg-glass-bg px-5 backdrop-blur-xl">
      {/* Left: Brand + Nav */}
      <div className="flex items-center gap-6">
        <Link href="/" className="text-base font-semibold tracking-tight text-foreground">
          DockYard
        </Link>
        <nav className="flex items-center gap-1">
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
                    ? "bg-primary/15 font-medium text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-glass-hover"
                }`}
              >
                {svc.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Right: Notifications + User */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-glass-hover hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-4.5 w-4.5" />
        </button>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-glass-hover"
          >
            {userImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={userImage}
                alt={userName ?? "User"}
                className="h-8 w-8 rounded-full ring-1 ring-glass-border"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-glass-hover text-xs font-medium text-muted-foreground ring-1 ring-glass-border">
                {userName?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-xl border border-glass-border bg-glass-bg p-1 shadow-lg backdrop-blur-xl">
              <Link
                href="/settings"
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground/80 transition-colors hover:bg-glass-hover"
                onClick={() => setMenuOpen(false)}
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                Settings
              </Link>
              <a
                href="https://github.com/siddhant-varma/dockyard"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground/80 transition-colors hover:bg-glass-hover"
              >
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                Support
              </a>
              <button
                type="button"
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground/80 transition-colors hover:bg-glass-hover"
              >
                <LogOut className="h-4 w-4 text-muted-foreground" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
