/**
 * ConfidenceBadge — color-coded confidence score indicator.
 *
 * Displays the project's confidence score as a percentage with
 * color coding: green (>70%), yellow (40-70%), red (<40%).
 *
 * @param score - Confidence score between 0.00 and 1.00.
 * @param size - Badge size variant.
 */

interface ConfidenceBadgeProps {
  score: number;
  size?: "sm" | "md";
}

export function ConfidenceBadge({ score, size = "sm" }: ConfidenceBadgeProps) {
  const percentage = Math.round(score * 100);
  const colorClass = getColorClass(score);
  const sizeClass = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${colorClass} ${sizeClass}`}
      title={`Confidence: ${percentage}%`}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
      {percentage}%
    </span>
  );
}

function getColorClass(score: number): string {
  if (score >= 0.7) return "bg-green-100 text-green-800";
  if (score >= 0.4) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
}
