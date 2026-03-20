/**
 * Brand illustrations for empty/error states.
 *
 * Consistent minimal geometric style matching the dock-pylon logo.
 * Uses brand blue palette.
 */

interface IllustrationProps {
  className?: string;
  size?: number;
}

/** 404 illustration — disconnected dock pylons. */
export function NotFoundIllustration({ className, size = 120 }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 120 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size * (80 / 120)}
      className={className}
      aria-hidden
    >
      {/* Left pylon — tilted/fallen */}
      <rect x="15" y="20" width="8" height="35" rx="2" fill="#0c8ce9" opacity="0.4" transform="rotate(-15 15 20)" />
      {/* Middle pylon — intact */}
      <rect x="50" y="15" width="8" height="40" rx="2" fill="#36a6ff" opacity="0.6" />
      {/* Right pylon — gap */}
      <rect x="85" y="25" width="8" height="30" rx="2" fill="#7cc4ff" opacity="0.3" />
      {/* Broken base beam — two segments with gap */}
      <rect x="10" y="55" width="35" height="5" rx="2" fill="#0c8ce9" opacity="0.3" />
      <rect x="60" y="55" width="35" height="5" rx="2" fill="#0c8ce9" opacity="0.3" />
      {/* 404 text */}
      <text x="60" y="75" textAnchor="middle" fontSize="10" fill="#7cc4ff" opacity="0.5" fontFamily="monospace">404</text>
    </svg>
  );
}

/** Empty state illustration — empty dock with no ships. */
export function EmptyStateIllustration({ className, size = 120 }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 120 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size * (80 / 120)}
      className={className}
      aria-hidden
    >
      {/* Three small pylons — faded, waiting */}
      <rect x="30" y="30" width="6" height="25" rx="1.5" fill="#0c8ce9" opacity="0.2" />
      <rect x="50" y="35" width="6" height="20" rx="1.5" fill="#36a6ff" opacity="0.15" />
      <rect x="70" y="40" width="6" height="15" rx="1.5" fill="#7cc4ff" opacity="0.1" />
      {/* Base beam — dashed appearance */}
      <rect x="25" y="55" width="15" height="3" rx="1" fill="#0c8ce9" opacity="0.15" />
      <rect x="45" y="55" width="15" height="3" rx="1" fill="#0c8ce9" opacity="0.15" />
      <rect x="65" y="55" width="15" height="3" rx="1" fill="#0c8ce9" opacity="0.15" />
    </svg>
  );
}

/** Error/failure illustration — cracked pylon. */
export function ErrorIllustration({ className, size = 120 }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 120 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size * (80 / 120)}
      className={className}
      aria-hidden
    >
      {/* Intact pylons */}
      <rect x="25" y="15" width="8" height="40" rx="2" fill="#0c8ce9" opacity="0.5" />
      <rect x="55" y="20" width="8" height="35" rx="2" fill="#36a6ff" opacity="0.5" />
      {/* Cracked pylon — two halves with lightning bolt gap */}
      <rect x="85" y="15" width="8" height="18" rx="2" fill="#ef4444" opacity="0.6" />
      <rect x="85" y="37" width="8" height="18" rx="2" fill="#ef4444" opacity="0.4" />
      {/* Lightning bolt crack */}
      <path d="M89 33 L92 30 L88 35 L91 32" stroke="#ef4444" strokeWidth="1.5" opacity="0.8" />
      {/* Base beam */}
      <rect x="20" y="55" width="78" height="5" rx="2" fill="#0c8ce9" opacity="0.3" />
    </svg>
  );
}
