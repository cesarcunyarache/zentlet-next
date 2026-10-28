"use client";

import { useEffect, useState } from "react";
import { useVoiceExamples } from "./useVoiceExamples";

const EXAMPLE_ROTATION_MS = 2600;

export function useRotatingExample(isPaused: boolean) {
  const examples = useVoiceExamples();
  const [exampleIndex, setExampleIndex] = useState(0);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => setExampleIndex((i) => (i + 1) % examples.length), EXAMPLE_ROTATION_MS);
    return () => clearInterval(timer);
  }, [isPaused, examples.length]);

  return examples[exampleIndex];
}
