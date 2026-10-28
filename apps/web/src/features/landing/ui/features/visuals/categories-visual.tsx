"use client";

import { motion, useReducedMotion } from "motion/react";
import type { DemoCategory } from "../../../content";

const TILE_HIDDEN = { opacity: 0, scale: 0.6, rotate: -8 };
const TILE_VISIBLE = { opacity: 1, scale: 1, rotate: 0 };
const TILE_VIEWPORT = { once: true, amount: 0.6 };
const HOVER_SCALE = 1.06;
const HOVER_TILT_DEGREES = 3;
const STAGGER_S = 0.08;

export function CategoriesVisual({ ideas }: { ideas: DemoCategory[] }) {
  const reduceMotion = useReducedMotion();

  return (
    <div aria-hidden className="grid h-full grid-cols-2 place-content-center gap-3">
      {ideas.map((idea, index) => {
        const hoverTilt = index % 2 ? HOVER_TILT_DEGREES : -HOVER_TILT_DEGREES;

        return (
          <motion.div
            key={idea.name}
            initial={reduceMotion ? false : TILE_HIDDEN}
            whileInView={TILE_VISIBLE}
            whileHover={reduceMotion ? undefined : { scale: HOVER_SCALE, rotate: hoverTilt }}
            viewport={TILE_VIEWPORT}
            transition={{ type: "spring", stiffness: 320, damping: 18, delay: STAGGER_S * index }}
            className="flex flex-col items-center gap-1.5 rounded-2xl p-3"
            style={{ background: idea.color }}
          >
            <span className="text-2xl leading-none">{idea.icon}</span>
            <span className="text-app-fg text-xs font-semibold">{idea.name}</span>
          </motion.div>
        );
      })}
    </div>
  );
}
