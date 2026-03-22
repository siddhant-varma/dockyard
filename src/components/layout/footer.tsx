/**
 * Footer — shared footer rendered at the bottom of every page.
 *
 * Matches Stitch wireframe footer: copyright, status indicator, links.
 * Rendered inside the canvas area so it respects max-width.
 */

export function Footer() {
  return (
    <footer className="mt-12 border-t border-glass-border py-4">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-foreground/30">
        <div className="flex items-center gap-2">
          <span>&copy; {new Date().getFullYear()} ShadowLabs</span>
          <span className="text-foreground/10">·</span>
          <span>MIT License</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
          <span>Operational</span>
        </div>
      </div>
    </footer>
  );
}
