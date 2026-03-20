/**
 * DockYard logo components.
 *
 * Three variants:
 * - LogoFull: icon + wordmark (for header bar)
 * - LogoIcon: icon only (for collapsed sidebar, favicon)
 * - LogoWordmark: text only (for minimal contexts)
 */

interface LogoProps {
  className?: string;
  size?: number;
}

/** Full logo: icon + "DockYard" wordmark. */
export function LogoFull({ className, size = 28 }: LogoProps) {
  const scale = size / 28;
  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <LogoIcon size={size} />
      <span
        className="font-semibold tracking-tight"
        style={{ fontSize: `${14 * scale}px` }}
      >
        <span className="text-foreground">Dock</span>
        <span className="text-brand-500">Yard</span>
      </span>
    </div>
  );
}

/** Icon only: three ascending bars on a base beam. */
export function LogoIcon({ className, size = 24 }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      width={size}
      height={size}
      className={className}
      aria-label="DockYard"
    >
      <rect x="4" y="6" width="5" height="20" rx="1.5" fill="#0c8ce9" />
      <rect x="12" y="12" width="5" height="14" rx="1.5" fill="#36a6ff" />
      <rect x="20" y="18" width="5" height="8" rx="1.5" fill="#7cc4ff" />
      <rect x="3" y="25" width="23" height="3" rx="1.5" fill="#0c8ce9" />
    </svg>
  );
}

/** Text-only wordmark. */
export function LogoWordmark({ className }: { className?: string }) {
  return (
    <span className={`font-semibold tracking-tight ${className ?? ""}`}>
      <span className="text-foreground">Dock</span>
      <span className="text-brand-500">Yard</span>
    </span>
  );
}
