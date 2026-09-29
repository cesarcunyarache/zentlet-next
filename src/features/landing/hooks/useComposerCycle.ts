"use client";

import { useEffect, useState } from "react";

export type ComposerPhase = "typing" | "reading" | "suggested";

export const TYPE_SPEED_MS = 65;
const TYPING_TAIL_MS = 250;
const READING_MS = 700;
const SUGGESTED_MS = 2600;

function typingDurationMs(text: string) {
  return Array.from(text).length * TYPE_SPEED_MS + TYPING_TAIL_MS;
}

export function useComposerCycle<Entry extends { typed: string }>(entries: Entry[], isPaused: boolean) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<ComposerPhase>("typing");
  const entry = entries[index];
  const entryCount = entries.length;

  useEffect(() => {
    if (isPaused) return;

    const typingMs = typingDurationMs(entry.typed);
    const timers = [
      setTimeout(() => setPhase("reading"), typingMs),
      setTimeout(() => setPhase("suggested"), typingMs + READING_MS),
      setTimeout(() => {
        setPhase("typing");
        setIndex((value) => (value + 1) % entryCount);
      }, typingMs + READING_MS + SUGGESTED_MS),
    ];
    return () => timers.forEach(clearTimeout);
  }, [entry.typed, entryCount, isPaused]);

  return { index, entry, phase: isPaused ? "suggested" : phase };
}
