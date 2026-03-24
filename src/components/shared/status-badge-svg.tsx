/**
 * SVG status badge component.
 *
 * Renders an inline SVG badge showing an uptime percentage with
 * color-coded background. Designed for embedding in project cards,
 * README files, or external status pages.
 *
 * Color thresholds:
 * - Green: uptime >= 99.5%
 * - Yellow: uptime >= 99.0%
 * - Red: uptime < 99.0%
 *
 * @example
 * ```tsx
 * <StatusBadgeSVG uptime={99.94} label="uptime" />
 * ```
 */

interface StatusBadgeSVGProps {
  /** Uptime percentage (0-100). */
  uptime: number;
  /** Label text shown on the left side of the badge (default: "uptime"). */
  label?: string;
  /** Badge height in pixels (default: 20). */
  height?: number;
}

/** Color configuration for each threshold tier. */
const TIERS = {
  green: { bg: "#22c55e", text: "#ffffff" },
  yellow: { bg: "#eab308", text: "#1a1a1a" },
  red: { bg: "#ef4444", text: "#ffffff" },
} as const;

/**
 * Determine the color tier based on uptime percentage.
 */
function getTier(uptime: number): keyof typeof TIERS {
  if (uptime >= 99.5) return "green";
  if (uptime >= 99) return "yellow";
  return "red";
}

/**
 * Inline SVG badge displaying an uptime percentage.
 *
 * Renders a shields.io-style badge with a label on the left and
 * the uptime percentage on the right, color-coded by threshold.
 *
 * @param props - Badge configuration
 * @returns SVG element showing the uptime badge
 */
export function StatusBadgeSVG({
  uptime,
  label = "uptime",
  height = 20,
}: StatusBadgeSVGProps) {
  const tier = getTier(uptime);
  const colors = TIERS[tier];
  const valueText = `${uptime.toFixed(1)}%`;

  // Calculate widths based on text length
  const labelWidth = label.length * 6.5 + 12;
  const valueWidth = valueText.length * 6.5 + 12;
  const totalWidth = labelWidth + valueWidth;
  const fontSize = height * 0.55;
  const textY = height * 0.72;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={totalWidth}
      height={height}
      role="img"
      aria-label={`${label}: ${valueText}`}
      className="inline-block"
    >
      <title>{`${label}: ${valueText}`}</title>

      {/* Background */}
      <clipPath id="badge-clip">
        <rect width={totalWidth} height={height} rx="3" />
      </clipPath>
      <g clipPath="url(#badge-clip)">
        {/* Label background (dark) */}
        <rect width={labelWidth} height={height} fill="#555" />
        {/* Value background (color-coded) */}
        <rect x={labelWidth} width={valueWidth} height={height} fill={colors.bg} />
      </g>

      {/* Text */}
      <g
        fill="#fff"
        textAnchor="middle"
        fontFamily="Verdana, Geneva, DejaVu Sans, sans-serif"
        fontSize={fontSize}
      >
        {/* Label text */}
        <text x={labelWidth / 2} y={textY} fill="#fff">
          {label}
        </text>
        {/* Value text */}
        <text x={labelWidth + valueWidth / 2} y={textY} fill={colors.text}>
          {valueText}
        </text>
      </g>
    </svg>
  );
}
