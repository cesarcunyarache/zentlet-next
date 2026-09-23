"use client";

import { createContext, useContext } from "react";
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

/*
 * Escena que sigue al puntero, como la del login: guarda la posición
 * normalizada a [-0.5, 0.5] y cada `Parallax` hijo se desplaza según su
 * profundidad. Sólo reacciona al ratón; en táctil queda quieta.
 */

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

export function PointerScene({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const x = useSpring(pointerX, SPRING_MOUSE);
  const y = useSpring(pointerY, SPRING_MOUSE);

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (reduceMotion || event.pointerType !== "mouse") return;
    pointerX.set(event.clientX / window.innerWidth - 0.5);
    pointerY.set(event.clientY / window.innerHeight - 0.5);
  }

  function handlePointerLeave() {
    pointerX.set(0);
    pointerY.set(0);
  }

  return (
    <PointerContext.Provider value={{ x, y }}>
      <div onPointerMove={handlePointerMove} onPointerLeave={handlePointerLeave} className={className}>
        {children}
      </div>
    </PointerContext.Provider>
  );
}

/** Capa que se desplaza con el puntero; `depth` negativo = en contra. */
export function Parallax({
  depth,
  className,
  style,
  children,
  decorative = false,
}: {
  depth: number;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  decorative?: boolean;
}) {
  const { x, y } = usePointer();
  const translateX = useTransform(x, [-0.5, 0.5], [-depth, depth]);
  const translateY = useTransform(y, [-0.5, 0.5], [-depth, depth]);

  return (
    <motion.div
      aria-hidden={decorative || undefined}
      style={{ x: translateX, y: translateY, ...style }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Contenedor que se inclina en 3D siguiendo al puntero. */
export function Tilt({
  max = 7,
  className,
  children,
}: {
  max?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const { x, y } = usePointer();
  const rotateY = useTransform(x, [-0.5, 0.5], [-max, max]);
  const rotateX = useTransform(y, [-0.5, 0.5], [max * 0.85, -max * 0.85]);

  return (
    <div className="[perspective:1600px]">
      <motion.div style={{ rotateX, rotateY }} className={cn("[transform-style:preserve-3d]", className)}>
        {children}
      </motion.div>
    </div>
  );
}

/** Tarjeta que flota arriba y abajo, cada una a su ritmo. */
export function FloatCard({
  delay = 0,
  className,
  children,
}: {
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      animate={reduceMotion ? undefined : { y: [0, -8, 0] }}
      transition={{ duration: 5, delay, repeat: Infinity, ease: "easeInOut" }}
      className={cn(
        "bg-app-surface text-app-fg rounded-2xl p-4 shadow-[0_18px_40px_-12px_color-mix(in_oklch,var(--app-fg)_35%,transparent)]",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}
