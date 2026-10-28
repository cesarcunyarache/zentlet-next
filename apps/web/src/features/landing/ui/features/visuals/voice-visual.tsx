"use client";

import { motion, useReducedMotion } from "motion/react";
import { Mic } from "lucide-react";

const BAR_HEIGHTS = [0.35, 0.7, 0.5, 1, 0.6, 0.85, 0.4, 0.75, 0.55, 0.3];
const BAR_TRANSITION = { duration: 0.9, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" } as const;
const BAR_STAGGER_S = 0.08;
const PULSE = { scale: [1, 1.6], opacity: [0.35, 0] };
const PULSE_TRANSITION = { duration: 1.6, repeat: Infinity, ease: "easeOut" } as const;

export function VoiceVisual({ transcript }: { transcript: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <div aria-hidden className="flex h-full flex-col items-center justify-center gap-5">
      <div className="relative grid place-items-center">
        {!reduceMotion && (
          <motion.span
            animate={PULSE}
            transition={PULSE_TRANSITION}
            className="bg-app-action absolute inset-0 rounded-full"
          />
        )}
        <span className="bg-app-fg text-app-bg relative grid size-14 place-items-center rounded-full">
          <Mic className="size-6" strokeWidth={2.2} />
        </span>
      </div>
      <div className="flex h-8 items-center gap-1">
        {BAR_HEIGHTS.map((height, index) => (
          <motion.span
            key={index}
            initial={false}
            animate={reduceMotion ? undefined : { scaleY: [height, 0.25] }}
            transition={{ ...BAR_TRANSITION, delay: BAR_STAGGER_S * index }}
            style={{ scaleY: height }}
            className="bg-app-fg h-full w-1 origin-center rounded-full"
          />
        ))}
      </div>
      <span className="bg-app-bg text-app-fg rounded-2xl px-4 py-2.5 text-sm font-medium ring-1 ring-[var(--app-border)]">
        <span className="text-app-muted">“</span>
        {transcript}
        <span className="text-app-muted">”</span>
      </span>
    </div>
  );
}
