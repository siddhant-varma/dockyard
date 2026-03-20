"use client";

/**
 * SVG time-series chart with a seconds-level time axis.
 *
 * Renders a polyline chart with:
 * - Time axis showing HH:MM:SS timestamps
 * - Gradient fill area beneath the line
 * - Tooltip on hover showing exact value + time
 * - Configurable max points (sliding window)
 */

import { useState, useMemo } from "react";

export interface TimeSeriesPoint {
  timestamp: number;
  value: number;
}

interface TimeSeriesChartProps {
  data: TimeSeriesPoint[];
  width?: number;
  height?: number;
  color?: string;
  unit?: string;
  maxPoints?: number;
  className?: string;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const PADDING = { top: 8, right: 12, bottom: 28, left: 12 };

export function TimeSeriesChart({
  data,
  width = 400,
  height = 160,
  color = "#6366f1",
  unit = "",
  maxPoints = 60,
  className = "",
}: TimeSeriesChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const points = useMemo(
    () => (maxPoints > 0 ? data.slice(-maxPoints) : data),
    [data, maxPoints]
  );

  if (points.length < 2) {
    return (
      <div
        className={`flex items-center justify-center text-xs text-neutral-400 ${className}`}
        style={{ width, height }}
      >
        Waiting for data...
      </div>
    );
  }

  const plotW = width - PADDING.left - PADDING.right;
  const plotH = height - PADDING.top - PADDING.bottom;

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coords = points.map((p, i) => ({
    x: PADDING.left + (i / (points.length - 1)) * plotW,
    y: PADDING.top + plotH - ((p.value - min) / range) * plotH,
  }));

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`).join(" ");
  const areaPath = `${linePath} L${coords[coords.length - 1].x},${PADDING.top + plotH} L${coords[0].x},${PADDING.top + plotH} Z`;

  // Time axis ticks — show ~5 ticks
  const tickCount = Math.min(5, points.length);
  const tickStep = Math.floor((points.length - 1) / (tickCount - 1));
  const ticks: Array<{ x: number; label: string }> = [];
  for (let i = 0; i < tickCount; i++) {
    const idx = Math.min(i * tickStep, points.length - 1);
    ticks.push({
      x: coords[idx].x,
      label: formatTime(points[idx].timestamp),
    });
  }

  const hoverPoint = hoverIndex !== null ? points[hoverIndex] : null;
  const hoverCoord = hoverIndex !== null ? coords[hoverIndex] : null;

  return (
    <div className={`relative ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          let closest = 0;
          let closestDist = Infinity;
          for (let i = 0; i < coords.length; i++) {
            const dist = Math.abs(coords[i].x - mouseX);
            if (dist < closestDist) {
              closestDist = dist;
              closest = i;
            }
          }
          setHoverIndex(closest);
        }}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {/* Gradient fill */}
        <defs>
          <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#grad-${color})`} />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Time axis */}
        {ticks.map((tick, i) => (
          <text
            key={i}
            x={tick.x}
            y={height - 4}
            textAnchor="middle"
            className="fill-neutral-400 dark:fill-neutral-500"
            fontSize="9"
            fontFamily="monospace"
          >
            {tick.label}
          </text>
        ))}

        {/* Hover indicator */}
        {hoverCoord && (
          <>
            <line
              x1={hoverCoord.x}
              y1={PADDING.top}
              x2={hoverCoord.x}
              y2={PADDING.top + plotH}
              stroke={color}
              strokeWidth="1"
              strokeDasharray="3,3"
              opacity="0.5"
            />
            <circle
              cx={hoverCoord.x}
              cy={hoverCoord.y}
              r="3.5"
              fill="white"
              stroke={color}
              strokeWidth="2"
            />
          </>
        )}
      </svg>

      {/* Tooltip */}
      {hoverPoint && hoverCoord && (
        <div
          className="pointer-events-none absolute z-10 rounded bg-neutral-900 px-2 py-1 text-xs text-white shadow dark:bg-neutral-100 dark:text-neutral-900"
          style={{
            left: Math.min(hoverCoord.x, width - 100),
            top: PADDING.top - 4,
            transform: "translateY(-100%)",
          }}
        >
          <span className="font-mono font-semibold">
            {hoverPoint.value.toFixed(1)}{unit}
          </span>
          <span className="ml-1.5 opacity-70">
            {formatTime(hoverPoint.timestamp)}
          </span>
        </div>
      )}
    </div>
  );
}
