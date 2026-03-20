/**
 * Tiny inline SVG sparkline chart.
 *
 * Renders a simple line chart from an array of numbers.
 * Pure SVG — no external chart library dependency.
 * RSC-compatible (no client-side JS required).
 *
 * @example
 * ```tsx
 * <Sparkline data={[10, 25, 15, 30, 20, 35]} />
 * <Sparkline data={[99.9, 99.8, 99.7, 99.9]} color="green" />
 * ```
 */

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export function Sparkline({
  data,
  width = 80,
  height = 24,
  color = "currentColor",
  className = "",
}: SparklineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 1;

  const points = data
    .map((value, i) => {
      const x = padding + (i / (data.length - 1)) * (width - padding * 2);
      const y =
        height - padding - ((value - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label={`Sparkline: ${data.length} data points, range ${min}–${max}`}
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
