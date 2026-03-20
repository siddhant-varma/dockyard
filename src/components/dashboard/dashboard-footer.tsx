/**
 * Dashboard footer — system status and version info.
 * Matches Stitch Glass Dashboard wireframe.
 */

export function DashboardFooter() {
  return (
    <footer className="flex items-center justify-between border-t border-glass-divider px-1 py-3 text-xs text-muted-foreground/60">
      <span>DockYard &copy; {new Date().getFullYear()}</span>
      <span className="flex items-center gap-1.5">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-40 animate-pulse-dot" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-400" />
        </span>
        System: Online
      </span>
    </footer>
  );
}
