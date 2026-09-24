"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type PanInfo, type Variants } from "motion/react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { track } from "@/lib/observability/client";
import { EASE_OUT, SPRING_LAYOUT, SPRING_PRESS } from "@/lib/ease";
import { useOnboarding } from "../onboarding-context";
import { MonthScene, TypeScene, VoiceScene } from "./onboarding-scenes";

const STEPS = ["type", "voice", "month"] as const;
const LAST = STEPS.length - 1;

/** Distancia o velocidad de arrastre a partir de la cual se cambia de paso. */
const SWIPE_DISTANCE = 60;
const SWIPE_VELOCITY = 400;

interface OnboardingProps {
  currency: string;
  hasCategories: boolean;
  /** Al terminar sin categorías: abrir su creación, el primer paso real. */
  onCreateCategory: () => void;
}

/**
 * Recorrido de bienvenida en 3 pasos para cuentas nuevas. Se avanza con los
 * botones, deslizando o con las flechas del teclado; Escape lo omite.
 */
export function Onboarding(props: OnboardingProps) {
  const { open } = useOnboarding();
  return <AnimatePresence>{open && <OnboardingDialog {...props} />}</AnimatePresence>;
}

function OnboardingDialog({ currency, hasCategories, onCreateCategory }: OnboardingProps) {
  const t = useTranslations("onboarding");
  const { finish } = useOnboarding();
  const reduceMotion = useReducedMotion();
  const [[step, direction], setStep] = useState<[number, 1 | -1]>([0, 1]);
  const primary = useRef<HTMLButtonElement>(null);

  const key = STEPS[step];
  const isLast = step === LAST;
  const createsCategory = isLast && !hasCategories;

  // la app queda detrás: sin desplazamiento mientras dura el recorrido
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    primary.current?.focus({ preventScroll: true });
  }, [step]);

  function go(next: number) {
    if (next < 0 || next > LAST) return;
    setStep([next, next > step ? 1 : -1]);
  }

  function close(skipped: boolean) {
    track("onboarding_completed", { skipped, step: step + 1, next: createsCategory && !skipped ? "categories" : "app" });
    finish();
    if (createsCategory && !skipped) onCreateCategory();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowRight") go(step + 1);
    else if (event.key === "ArrowLeft") go(step - 1);
    else if (event.key === "Escape") close(true);
  }

  function onDragEnd(_: unknown, { offset, velocity }: PanInfo) {
    if (offset.x < -SWIPE_DISTANCE || velocity.x < -SWIPE_VELOCITY) go(step + 1);
    else if (offset.x > SWIPE_DISTANCE || velocity.x > SWIPE_VELOCITY) go(step - 1);
  }

  // hacia delante entra por la derecha; hacia atrás, por la izquierda
  const slide: Variants = {
    enter: (dir: number) => (reduceMotion ? { opacity: 0 } : { opacity: 0, x: 56 * dir }),
    center: { opacity: 1, x: 0 },
    exit: (dir: number) => (reduceMotion ? { opacity: 0 } : { opacity: 0, x: -56 * dir }),
  };

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      aria-describedby="onboarding-body"
      onKeyDown={onKeyDown}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.25 } }}
      className="bg-app-bg text-app-fg fixed inset-0 z-[60] flex flex-col"
    >
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduceMotion ? undefined : { opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.5, ease: EASE_OUT }}
        className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pt-[calc(16px+env(safe-area-inset-top))] pb-[calc(20px+env(safe-area-inset-bottom))] sm:px-6"
      >
        <header className="flex h-11 items-center justify-between">
          <span className="sr-only">{t("label")}</span>
          <div
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={STEPS.length}
            aria-valuenow={step + 1}
            aria-valuetext={t("progress", { current: step + 1, total: STEPS.length })}
            className="flex items-center gap-1.5"
          >
            {STEPS.map((name, index) => (
              <motion.span
                key={name}
                animate={{ width: index === step ? 28 : 8 }}
                transition={SPRING_LAYOUT}
                className={`h-2 rounded-full transition-colors ${index <= step ? "bg-app-fg" : "bg-app-fill-strong"}`}
              />
            ))}
          </div>
          {!isLast && (
            <button
              type="button"
              onClick={() => close(true)}
              className="text-app-muted hover:text-app-fg min-h-11 rounded-full px-3 text-sm font-semibold transition-colors"
            >
              {t("skip")}
            </button>
          )}
        </header>

        <div className="relative mt-6 flex flex-1 flex-col">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={key}
              custom={direction}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: EASE_OUT }}
              drag={reduceMotion ? false : "x"}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={onDragEnd}
              className="flex flex-1 cursor-grab flex-col justify-center active:cursor-grabbing"
            >
              {key === "type" && <TypeScene />}
              {key === "voice" && <VoiceScene currency={currency} />}
              {key === "month" && <MonthScene currency={currency} />}

              <div className="mt-8 px-1">
                <h2 id="onboarding-title" className="font-display m-0 text-[28px] leading-tight font-bold tracking-[-0.03em]">
                  {t(`steps.${key}.title`)}
                </h2>
                <p id="onboarding-body" className="text-app-muted m-0 mt-3 text-[15px] leading-relaxed">
                  {createsCategory ? t("steps.month.bodyNoCategories") : t(`steps.${key}.body`)}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <footer className="mt-8 flex items-center gap-3">
          <AnimatePresence initial={false}>
            {step > 0 && (
              <motion.button
                type="button"
                aria-label={t("back")}
                onClick={() => go(step - 1)}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileTap={{ scale: 0.92 }}
                transition={SPRING_PRESS}
                className="bg-app-fill text-app-fg hover:bg-app-fill-strong grid size-14 shrink-0 place-items-center rounded-2xl transition-colors"
              >
                <ArrowLeft className="size-5" strokeWidth={2.2} />
              </motion.button>
            )}
          </AnimatePresence>

          <motion.button
            ref={primary}
            type="button"
            layout
            onClick={() => (isLast ? close(false) : go(step + 1))}
            whileTap={{ scale: 0.97 }}
            transition={SPRING_LAYOUT}
            className="bg-app-fg text-app-bg flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl text-base font-semibold shadow-[0_14px_28px_-12px_color-mix(in_oklch,var(--app-fg)_55%,transparent)]"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={isLast ? (createsCategory ? "create" : "start") : "next"}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="flex items-center gap-2"
              >
                {isLast ? t(createsCategory ? "createCategory" : "start") : t("next")}
                {!isLast && <ArrowRight className="size-4" strokeWidth={2.4} />}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </footer>
      </motion.div>
    </motion.div>
  );
}
