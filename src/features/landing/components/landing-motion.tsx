"use client";

import { MotionConfig } from "motion/react";

/**
 * Todas las animaciones de Motion de la landing respetan
 * `prefers-reduced-motion`: se quedan las transiciones de opacidad y se
 * anulan desplazamientos y escalas.
 */
export function LandingMotion({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
