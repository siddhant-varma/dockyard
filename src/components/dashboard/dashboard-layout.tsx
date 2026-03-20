"use client";

/**
 * Animated layout wrapper for the home dashboard.
 *
 * Wraps dashboard sections in a staggered fade-up reveal animation.
 * Each direct child is animated as a separate item in the stagger sequence.
 * Respects `prefers-reduced-motion`.
 */

import { type ReactNode } from "react";
import { StaggerContainer, FadeUp } from "@/components/shared";

interface DashboardLayoutProps {
  children: ReactNode[];
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <StaggerContainer className="flex flex-col gap-6">
      {children.map((child, i) => (
        <FadeUp key={i}>{child}</FadeUp>
      ))}
    </StaggerContainer>
  );
}
