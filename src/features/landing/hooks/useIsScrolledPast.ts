"use client";

import { useState } from "react";
import { useMotionValueEvent, useScroll } from "motion/react";

export function useIsScrolledPast(threshold: number) {
  const [isScrolledPast, setIsScrolledPast] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => setIsScrolledPast(latest > threshold));

  return isScrolledPast;
}
