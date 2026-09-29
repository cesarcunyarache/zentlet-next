"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@heroui/react";
import { Mic } from "lucide-react";
import { useTranslations } from "next-intl";
import { useVoiceExamples } from "./use-voice-examples";
import { listeningStatusKey } from "./voice-entry.logic";
import { VOICE_VIEW_MOTION } from "./voice-view-motion";

const BAR_PEAKS = [18, 30, 42, 26, 38, 22, 14];
const RING_IDS = [0, 1, 2];
const EXAMPLE_ROTATION_MS = 2600;

interface VoiceListeningViewProps {
  isReady: boolean;
  isSpeaking: boolean;
  transcript: string;
}

export function VoiceListeningView({ isReady, isSpeaking, transcript }: VoiceListeningViewProps) {
  const t = useTranslations("transactions.voice");
  const shouldReduceMotion = Boolean(useReducedMotion());

  return (
    <motion.div {...VOICE_VIEW_MOTION} className="flex flex-1 flex-col items-center justify-center gap-7 py-6">
      <div className="relative grid size-44 place-items-center">
        {shouldReduceMotion ? null : <ListeningRings isSpeaking={isSpeaking} />}
        <motion.span
          aria-hidden
          className="bg-app-expense text-app-surface relative grid size-24 place-items-center rounded-full shadow-[var(--shadow-fab)]"
          animate={isSpeaking && !shouldReduceMotion ? { scale: [1, 1.07, 1] } : { scale: 1 }}
          transition={{ duration: 0.7, repeat: isSpeaking ? Infinity : 0, ease: "easeInOut" }}
        >
          <Mic className="size-10" strokeWidth={2} />
        </motion.span>
      </div>

      <VoiceLevelBars isReady={isReady} isSpeaking={isSpeaking} shouldReduceMotion={shouldReduceMotion} />

      <div className="flex min-h-[112px] w-full flex-col items-center gap-2 text-center">
        <p role="status" aria-live="polite" className="text-app-muted m-0 text-sm font-semibold">
          {t(listeningStatusKey(isReady, isSpeaking))}
        </p>
        <TranscriptOrExample transcript={transcript} />
      </div>
    </motion.div>
  );
}

function ListeningRings({ isSpeaking }: { isSpeaking: boolean }) {
  return RING_IDS.map((ring) => (
    <span
      key={ring}
      aria-hidden
      className="bg-app-expense voice-ring absolute inset-4 rounded-full opacity-0"
      style={
        {
          "--ring-scale": isSpeaking ? 1.45 : 1.25,
          "--ring-opacity": isSpeaking ? 0.32 : 0.2,
          "--ring-duration": isSpeaking ? "1.3s" : "2.4s",
          "--ring-delay": `${ring * (isSpeaking ? 0.43 : 0.8)}s`,
        } as React.CSSProperties
      }
    />
  ));
}

interface VoiceLevelBarsProps {
  isReady: boolean;
  isSpeaking: boolean;
  shouldReduceMotion: boolean;
}

function VoiceLevelBars({ isReady, isSpeaking, shouldReduceMotion }: VoiceLevelBarsProps) {
  function barHeights(peak: number) {
    if (isSpeaking && !shouldReduceMotion) return { height: [8, peak, 12, peak * 0.7, 8] };
    return { height: isReady && !shouldReduceMotion ? [6, 10, 6] : 6 };
  }

  return (
    <div aria-hidden className="flex h-12 items-center gap-1.5">
      {BAR_PEAKS.map((peak, index) => (
        <motion.span
          key={peak}
          className={cn("w-1.5 rounded-full", isSpeaking ? "bg-app-expense" : "bg-app-fill-strong")}
          animate={barHeights(peak)}
          transition={{
            duration: isSpeaking ? 0.9 + (index % 3) * 0.15 : 1.6,
            repeat: Infinity,
            delay: index * 0.08,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

function useRotatingExample(isPaused: boolean) {
  const examples = useVoiceExamples();
  const [exampleIndex, setExampleIndex] = useState(0);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => setExampleIndex((i) => (i + 1) % examples.length), EXAMPLE_ROTATION_MS);
    return () => clearInterval(timer);
  }, [isPaused, examples.length]);

  return examples[exampleIndex];
}

function TranscriptOrExample({ transcript }: { transcript: string }) {
  const example = useRotatingExample(Boolean(transcript));

  return (
    <AnimatePresence mode="wait" initial={false}>
      {transcript ? (
        <motion.p
          key="transcript"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="font-display text-app-fg m-0 max-w-sm text-[26px] leading-tight font-bold tracking-[-0.02em]"
        >
          {transcript}
        </motion.p>
      ) : (
        <motion.p
          key={example}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className="font-display text-app-muted/60 m-0 text-[22px] leading-tight font-bold tracking-[-0.02em]"
        >
          «{example}»
        </motion.p>
      )}
    </AnimatePresence>
  );
}
