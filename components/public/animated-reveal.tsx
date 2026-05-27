"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ReactNode } from "react";

interface AnimatedRevealProps {
  children: ReactNode;
  delay?: number;
  direction?: "up" | "down" | "left" | "right";
  className?: string;
  duration?: number;
}

export function AnimatedReveal({
  children,
  delay = 0,
  direction = "up",
  className,
  duration = 0.6,
}: AnimatedRevealProps) {
  const reduce = useReducedMotion();

  const getDirectionOffset = () => {
    switch (direction) {
      case "up": return { y: 24, x: 0 };
      case "down": return { y: -24, x: 0 };
      case "left": return { x: 24, y: 0 };
      case "right": return { x: -24, y: 0 };
      default: return { y: 24, x: 0 };
    }
  };

  const offset = getDirectionOffset();

  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, ...offset }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{
        duration,
        delay,
        ease: [0.16, 1, 0.3, 1], // Apple-like ease-out
      }}
    >
      {children}
    </motion.div>
  );
}
