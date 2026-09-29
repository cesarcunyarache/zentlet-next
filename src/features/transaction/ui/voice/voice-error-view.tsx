"use client";

import { motion } from "motion/react";
import { MicOff, WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { SPRING_PRESS } from "@/lib/ease";
import type { SpeechError } from "../../types";
import { useVoiceExamples } from "../../hooks/voice/useVoiceExamples";
import { VOICE_VIEW_MOTION } from "./voice-view-motion";

const ERROR_KEYS = {
  denied: "denied",
  "no-mic": "noMic",
  "no-speech": "noSpeech",
  network: "network",
  unsupported: "unsupported",
  unknown: "unknown",
} as const satisfies Record<SpeechError, string>;

interface VoiceErrorViewProps {
  error: SpeechError;
}

export function VoiceErrorView({ error }: VoiceErrorViewProps) {
  const t = useTranslations("transactions.voice.errors");
  const [example] = useVoiceExamples();
  const key = ERROR_KEYS[error];
  const Icon = error === "network" ? WifiOff : MicOff;

  return (
    <motion.div
      {...VOICE_VIEW_MOTION}
      className="flex flex-1 flex-col items-center justify-center gap-4 py-8 text-center"
    >
      <motion.span
        initial={{ scale: 0.6, rotate: -12 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={SPRING_PRESS}
        className="bg-app-expense-soft text-app-expense grid size-20 place-items-center rounded-full"
      >
        <Icon className="size-8" strokeWidth={2} />
      </motion.span>
      <h3 className="font-display text-app-fg m-0 text-2xl font-bold tracking-[-0.02em]">{t(`${key}.title`)}</h3>
      <p role="alert" className="text-app-muted m-0 max-w-sm text-sm leading-relaxed">
        {t(`${key}.body`, { example: example.toLowerCase() })}
      </p>
    </motion.div>
  );
}
