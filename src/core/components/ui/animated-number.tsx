"use client";

import { useEffect } from "react";
import {
  motion,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";

interface AnimatedNumberProps {
  value: number;
  format: (value: number) => string;
  className?: string;
}

/** Cifra que rueda hasta su nuevo valor en lugar de saltar. */
export function AnimatedNumber({ value, format, className }: AnimatedNumberProps) {
  const reduceMotion = useReducedMotion();
  const spring = useSpring(0, { stiffness: 120, damping: 22, mass: 0.7 });
  const text = useTransform(spring, (current) => format(current));

  useEffect(() => {
    if (reduceMotion) spring.jump(value);
    else spring.set(value);
  }, [spring, value, reduceMotion]);

  return <motion.span className={className}>{text}</motion.span>;
}
