"use client";

/**
 * Reusable Framer Motion animation primitives for the Glass Observatory UI.
 *
 * Provides staggered fade-up reveals, glass card entrance animations,
 * and page-level transition wrappers. All animations respect
 * `prefers-reduced-motion` via the `useReducedMotion` hook.
 *
 * @example
 * ```tsx
 * <StaggerContainer>
 *   <FadeUp><Card /></FadeUp>
 *   <FadeUp><Card /></FadeUp>
 * </StaggerContainer>
 * ```
 */

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { type ReactNode } from "react";

/** Stagger container — orchestrates child `FadeUp` animations. */
const staggerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
};

/** Individual item fade-up animation. */
const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 12, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.45,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

/** Scale-in for glass cards on hover or focus. */
const glassHoverVariants: Variants = {
  rest: { scale: 1 },
  hover: {
    scale: 1.01,
    transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
  },
};

interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  /** Delay before the stagger sequence starts (seconds). */
  delay?: number;
}

/**
 * Wrapper that staggers the entrance of child `FadeUp` components.
 * Triggers when the container enters the viewport.
 */
export function StaggerContainer({
  children,
  className,
  delay = 0,
}: StaggerContainerProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      variants={staggerVariants}
      initial="hidden"
      animate="visible"
      transition={{ delayChildren: delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface FadeUpProps {
  children: ReactNode;
  className?: string;
}

/** Fade-up + deblur animation for individual items inside a StaggerContainer. */
export function FadeUp({ children, className }: FadeUpProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div variants={fadeUpVariants} className={className}>
      {children}
    </motion.div>
  );
}

interface GlassCardMotionProps {
  children: ReactNode;
  className?: string;
}

/** Glass card with subtle scale-up on hover. */
export function GlassCardMotion({ children, className }: GlassCardMotionProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      variants={glassHoverVariants}
      initial="rest"
      whileHover="hover"
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
}

/** Reveals content when it enters the viewport via scroll. */
export function ScrollReveal({ children, className }: ScrollRevealProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
