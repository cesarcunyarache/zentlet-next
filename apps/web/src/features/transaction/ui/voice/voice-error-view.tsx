"use client";

import { MicOff, WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import type { SpeechError } from "../../types";
import { useVoiceExamples } from "../../hooks/voice/useVoiceExamples";
import { EntryErrorView } from "../entry/entry-error-view";

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

  return (
    <EntryErrorView
      icon={error === "network" ? WifiOff : MicOff}
      title={t(`${key}.title`)}
      body={t(`${key}.body`, { example: example.toLowerCase() })}
    />
  );
}
