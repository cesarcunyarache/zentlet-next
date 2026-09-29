"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "@/i18n/routing";

interface SpeechRecognitionAlternative {
  transcript: string;
}
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly 0: SpeechRecognitionAlternative;
}
interface SpeechRecognitionEvent extends Event {
  readonly results: ArrayLike<SpeechRecognitionResult>;
}
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}
interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

export type SpeechError = "unsupported" | "denied" | "no-mic" | "no-speech" | "network" | "unknown";
export type SpeechStatus = "idle" | "starting" | "listening" | "done" | "error";

const ABORTED = "aborted";
const DEFAULT_LANG: Record<Locale, string> = { es: "es-PE", en: "en-US" };

const ERRORS = new Map<string, SpeechError>([
  ["not-allowed", "denied"],
  ["service-not-allowed", "denied"],
  ["audio-capture", "no-mic"],
  ["no-speech", "no-speech"],
  ["network", "network"],
]);

function getRecognitionClass(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function recognitionLang(locale: Locale) {
  const preferred = navigator.language;
  if (preferred.toLowerCase().startsWith(locale)) return preferred;
  return DEFAULT_LANG[locale];
}

function createRecognition(Recognition: SpeechRecognitionConstructor, locale: Locale) {
  const instance = new Recognition();
  instance.lang = recognitionLang(locale);
  instance.continuous = false;
  instance.interimResults = true;
  instance.maxAlternatives = 1;
  return instance;
}

const transcriptOf = (event: SpeechRecognitionEvent) =>
  Array.from(event.results, (result) => result[0].transcript).join(" ").trim();

export function useSpeechRecognition(locale: Locale) {
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const [error, setError] = useState<SpeechError | null>(null);
  const [transcript, setTranscript] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognition = useRef<SpeechRecognitionInstance | null>(null);

  const fail = useCallback((reason: SpeechError) => {
    setError(reason);
    setStatus("error");
  }, []);

  const stop = useCallback(() => recognition.current?.stop(), []);

  const cancel = useCallback(() => {
    const current = recognition.current;
    recognition.current = null;
    current?.abort();
    setStatus("idle");
    setIsSpeaking(false);
  }, []);

  const listen = useCallback(
    (instance: SpeechRecognitionInstance) => {
      let heard = "";
      let hasFailed = false;

      instance.onstart = () => setStatus("listening");
      instance.onspeechstart = () => setIsSpeaking(true);
      instance.onspeechend = () => setIsSpeaking(false);
      instance.onresult = (event) => {
        heard = transcriptOf(event);
        setTranscript(heard);
      };
      instance.onerror = (event) => {
        if (event.error === ABORTED) return;
        hasFailed = true;
        fail(ERRORS.get(event.error) ?? "unknown");
      };
      instance.onend = () => {
        if (recognition.current !== instance) return;
        recognition.current = null;
        setIsSpeaking(false);
        if (hasFailed) return;
        if (heard) setStatus("done");
        else fail("no-speech");
      };
    },
    [fail],
  );

  const start = useCallback(() => {
    const Recognition = getRecognitionClass();
    setTranscript("");
    setIsSpeaking(false);
    if (!Recognition) {
      fail("unsupported");
      return;
    }

    recognition.current?.abort();
    const instance = createRecognition(Recognition, locale);
    recognition.current = instance;
    listen(instance);

    setError(null);
    setStatus("starting");
    try {
      instance.start();
    } catch {
      fail("unknown");
    }
  }, [locale, fail, listen]);

  useEffect(() => () => recognition.current?.abort(), []);

  return {
    status,
    error,
    transcript,
    isSpeaking,
    isSupported: getRecognitionClass() !== null,
    start,
    stop,
    cancel,
  };
}
