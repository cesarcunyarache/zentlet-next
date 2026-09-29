"use client";

import { createContext, useContext, useMemo } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { SPRING_MOUSE } from "@/lib/ease";
import { cn } from "@/lib/utils";

const POINTER_RANGE = [-0.5, 0.5];
const POINTER_CENTER_OFFSET = 0.5;
const DEFAULT_TILT_DEGREES = 7;
const TILT_X_FACTOR = 0.85;
const FLOAT_KEYFRAMES = { y: [0, -8, 0] };
const FLOAT_DURATION_S = 5;

interface PointerValues {
  x: MotionValue<number>;
  y: MotionValue<number>;
}

const PointerContext = createContext<PointerValues | null>(null);

export function usePointer() {
  const value = useContext(PointerContext);
  if (!value) throw new Error("usePointer debe usarse dentro de <PointerScene>");
  return value;
}

interface PointerSceneProps {
  className?: string;
  children: React.ReactNode;
}

export function PointerScene({ className, children }: PointerSceneProps) {
  const reduceMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const x = useSpring(pointerX, SPRING_MOUSE);
  const y = useSpring(pointerY, SPRING_MOUSE);
  const pointer = useMemo(() => ({ x, y }), [x, y]);

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (reduceMotion || event.pointerType !== "mouse") return;
    pointerX.set(event.clientX / window.innerWidth - POINTER_CENTER_OFFSET);
    pointerY.set(event.clientY / window.innerHeight - POINTER_CENTER_OFFSET);
  }

  function handlePointerLeave() {
    pointerX.set(0);
    pointerY.set(0);
  }

  return (
    <PointerContext.Provider value={pointer}>
      <div onPointerMove={handlePointerMove} onPointerLeave={handlePointerLeave} className={className}>
        {children}
      </div>
    </PointerContext.Provider>
  );
}

interface ParallaxProps {
  depth: number;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  isDecorative?: boolean;
}

export function Parallax({ depth, className, style, children, isDecorative = false }: ParallaxProps) {
  const { x, y } = usePointer();
  const translateX = useTransform(x, POINTER_RANGE, [-depth, depth]);
  const translateY = useTransform(y, POINTER_RANGE, [-depth, depth]);

  return (
    <motion.div
      aria-hidden={isDecorative || undefined}
      style={{ x: translateX, y: translateY, ...style }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface TiltProps {
  max?: number;
  className?: string;
  children: React.ReactNode;
}

export function Tilt({ max = DEFAULT_TILT_DEGREES, className, children }: TiltProps) {
  const { x, y } = usePointer();
  const rotateY = useTransform(x, POINTER_RANGE, [-max, max]);
  const rotateX = useTransform(y, POINTER_RANGE, [max * TILT_X_FACTOR, -max * TILT_X_FACTOR]);

  return (
    <div className="[perspective:1600px]">
      <motion.div style={{ rotateX, rotateY }} className={cn("[transform-style:preserve-3d]", className)}>
        {children}
      </motion.div>
    </div>
  );
}

interface FloatCardProps {
  delay?: number;
  className?: string;
  children: React.ReactNode;
}

export function FloatCard({ delay = 0, className, children }: FloatCardProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      animate={reduceMotion ? undefined : FLOAT_KEYFRAMES}
      transition={{ duration: FLOAT_DURATION_S, delay, repeat: Infinity, ease: "easeInOut" }}
      className={cn(
        "bg-app-surface text-app-fg rounded-2xl p-4 shadow-[0_18px_40px_-12px_color-mix(in_oklch,var(--app-fg)_35%,transparent)]",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}
