"use client";

import { motion, useReducedMotion } from "motion/react";
import { SPRING_PRESS } from "@/lib/ease";

interface GlowProps {
  className: string;
}

interface PopProps {
  delay: number;
  children: React.ReactNode;
  className?: string;
}

interface SceneFrameProps {
  children: React.ReactNode;
}

export const TRANSPORT = { icon: "🚌", color: "#D6E8F7" };
export const FOOD = { icon: "🍽️", color: "#FBDDD5" };
export const HOME = { icon: "🏠", color: "#E4DDF3" };

const POP_HIDDEN = { opacity: 0, scale: 0.8, y: 8 };
const POP_VISIBLE = { opacity: 1, scale: 1, y: 0 };

export function SceneFrame({ children }: SceneFrameProps) {
  return (
    <div
      aria-hidden
      className="relative flex h-[300px] w-full flex-col items-center justify-center overflow-hidden rounded-[32px] bg-app-surface ring-1 ring-[var(--app-border)]"
    >
      {children}
    </div>
  );
}

export function Glow({ className }: GlowProps) {
  return <div aria-hidden className={`pointer-events-none absolute size-56 rounded-full blur-3xl ${className}`} />;
}

export function Pop({ delay, children, className }: PopProps) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? false : POP_HIDDEN}
      animate={POP_VISIBLE}
      transition={{ ...SPRING_PRESS, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
