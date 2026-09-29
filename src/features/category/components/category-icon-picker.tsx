"use client";

import { AnimatePresence, motion } from "motion/react";
import { GestureCarousel } from "@/core/components/carrusel";
import type { CategoryIcon } from "../ai/schemas/category-ai.schema";

const POP_IN = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.2 },
} as const;

const SHIMMER_ANIMATE = { translateX: ["-100%", "100%"] };
const SHIMMER_TRANSITION = { repeat: Infinity, duration: 1.2, ease: "linear" } as const;

interface CategoryIconPickerProps {
  icons: CategoryIcon[];
  value: CategoryIcon;
  isLoading: boolean;
  onChange: (icon: CategoryIcon) => void;
}

export function CategoryIconPicker({ icons, value, isLoading, onChange }: CategoryIconPickerProps) {
  return (
    <div className="h-32 w-32">
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="skeleton"
            {...POP_IN}
            exit={POP_IN.initial}
            className="relative h-full w-full overflow-hidden rounded-2xl bg-gray-100"
          >
            <motion.div
              className="absolute inset-0 -translate-x-full from-transparent via-white/40 to-transparent"
              animate={SHIMMER_ANIMATE}
              transition={SHIMMER_TRANSITION}
            />
          </motion.div>
        ) : icons.length > 0 ? (
          <motion.div key="carousel" {...POP_IN} className="h-full w-full">
            <GestureCarousel items={icons} value={value} onChange={onChange} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
