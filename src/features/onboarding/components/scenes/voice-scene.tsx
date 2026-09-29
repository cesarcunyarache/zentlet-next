"use client";

import { motion, useReducedMotion } from "motion/react";
import { Mic } from "lucide-react";
import { useTranslations } from "next-intl";
import { TypingAnimation } from "@/core/components/ui/typing-animation";
import { CategoryEmoji } from "@/features/category/components/category-emoji";
import { EASE_OUT } from "@/lib/ease";
import { FOOD, Glow, Pop, SceneFrame } from "./scene-primitives";

interface VoiceSceneProps {
  currency: string;
}

const PULSE_RINGS = [0, 1, 2];
const PULSE_STAGGER = 0.8;
const PULSE_HIDDEN = { opacity: 0.35, scale: 0.7 };
const PULSE_EXPANDED = { opacity: 0, scale: 1.9 };

const WAVE_BARS = [
  { id: "bar-1", height: 14 },
  { id: "bar-2", height: 26 },
  { id: "bar-3", height: 38 },
  { id: "bar-4", height: 22 },
  { id: "bar-5", height: 32 },
  { id: "bar-6", height: 18 },
  { id: "bar-7", height: 10 },
];
const WAVE_STAGGER = 0.09;
const WAVE_ANIMATION = { scaleY: [0.35, 1, 0.5, 0.9, 0.35] };

const TYPING_DELAY_MS = 500;
const TYPING_SPEED_MS = 55;

const SAMPLE_AMOUNT = "35.00";

export function VoiceScene({ currency }: VoiceSceneProps) {
  const t = useTranslations("onboarding.steps.voice");
  const reduceMotion = useReducedMotion();
  const quote = `«${t("phrase")}»`;

  return (
    <SceneFrame>
      <Glow className="-bottom-28 -left-16 bg-[color-mix(in_oklch,var(--app-income)_20%,transparent)]" />

      <div className="relative grid size-24 place-items-center">
        {!reduceMotion &&
          PULSE_RINGS.map((ring) => (
            <motion.span
              key={ring}
              className="bg-app-expense absolute inset-0 rounded-full"
              initial={PULSE_HIDDEN}
              animate={PULSE_EXPANDED}
              transition={{ duration: 2.4, repeat: Infinity, delay: ring * PULSE_STAGGER, ease: EASE_OUT }}
            />
          ))}
        <span className="bg-app-expense text-app-surface relative grid size-16 place-items-center rounded-full shadow-[var(--shadow-fab)]">
          <Mic className="size-7" strokeWidth={2.2} />
        </span>
      </div>

      <div className="relative mt-3 flex h-10 items-center gap-1">
        {WAVE_BARS.map((bar, index) => (
          <motion.span
            key={bar.id}
            className="bg-app-fg/70 w-1 rounded-full"
            style={{ height: bar.height }}
            animate={reduceMotion ? undefined : WAVE_ANIMATION}
            transition={{ duration: 1.1, repeat: Infinity, delay: index * WAVE_STAGGER, ease: "easeInOut" }}
          />
        ))}
      </div>

      <div className="bg-app-fill text-app-fg relative mt-2 rounded-2xl rounded-bl-md px-4 py-2 text-sm font-medium">
        {reduceMotion ? (
          <span>{quote}</span>
        ) : (
          <TypingAnimation
            startOnView={false}
            delay={TYPING_DELAY_MS}
            typeSpeed={TYPING_SPEED_MS}
            showCursor={false}
            className="text-sm leading-normal font-medium tracking-normal"
          >
            {quote}
          </TypingAnimation>
        )}
      </div>

      <Pop
        delay={2.4}
        className="bg-app-bg relative mt-3 flex items-center gap-3 rounded-2xl py-2 pr-4 pl-2 shadow-[0_12px_30px_-16px_color-mix(in_oklch,var(--app-ink)_45%,transparent)] ring-1 ring-[var(--app-border)]"
      >
        <CategoryEmoji category={FOOD} className="size-9 rounded-xl text-base" />
        <span className="flex flex-col">
          <span className="text-app-fg text-sm font-semibold">{t("category")}</span>
          <span className="text-app-muted text-xs">{t("yesterday")}</span>
        </span>
        <span className="text-app-expense ml-3 text-sm font-bold">
          − {currency} {SAMPLE_AMOUNT}
        </span>
      </Pop>
    </SceneFrame>
  );
}
