/**
 * AnimatedGrid — client wrapper that applies stagger animation to grid children.
 *
 * Wraps a CSS grid with Framer Motion stagger-in. Each direct child fades in
 * sequentially. Used by server components to animate grids without becoming
 * client components themselves.
 */

"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface AnimatedGridProps {
  children: ReactNode;
  className?: string;
  stagger?: number;
}

const container = (stagger: number) => ({
  hidden: {},
  visible: { transition: { staggerChildren: stagger } },
});

const item = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function AnimatedGrid({
  children,
  className,
  stagger = 0.06,
}: AnimatedGridProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={container(stagger)}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={item} className={className}>
      {children}
    </motion.div>
  );
}
