"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "@/i18n/routing";

/*
 * Web Speech API, sin dependencias. En Chrome y Edge el audio se transcribe
 * en servidores de Google: sin conexión falla con "network". Safari puede
 * transcribir en el dispositivo.
 */

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

function getRecognitionClass(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const ERRORS: Record<string, SpeechError> = {
  "not-allowed": "denied",
  "service-not-allowed": "denied",
  "audio-capture": "no-mic",
  "no-speech": "no-speech",
  network: "network",
};

/** Idioma de la app; la variante regional del navegador si coincide ("es-MX", "en-GB"). */
function recognitionLang(locale: Locale) {
  const preferred = navigator.language;
  if (preferred.toLowerCase().startsWith(locale)) return preferred;
  return locale === "en" ? "en-US" : "es-PE";
}

export function useSpeechRecognition(locale: Locale) {
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const [error, setError] = useState<SpeechError | null>(null);
  const [transcript, setTranscript] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognition = useRef<SpeechRecognitionInstance | null>(null);

  const stop = useCallback(() => recognition.current?.stop(), []);

  const cancel = useCallback(() => {
    const current = recognition.current;
    recognition.current = null;
    current?.abort();
    setStatus("idle");
    setIsSpeaking(false);
  }, []);

  const start = useCallback(() => {
    const Recognition = getRecognitionClass();
    setTranscript("");
    setIsSpeaking(false);
    if (!Recognition) {
      setError("unsupported");
      setStatus("error");
      return;
    }

    recognition.current?.abort();
    const instance = new Recognition();
    recognition.current = instance;
    instance.lang = recognitionLang(locale);
    instance.continuous = false;
    instance.interimResults = true;
    instance.maxAlternatives = 1;

    let heard = "";
    let failed = false;

    instance.onstart = () => setStatus("listening");
    instance.onspeechstart = () => setIsSpeaking(true);
    instance.onspeechend = () => setIsSpeaking(false);
    instance.onresult = (event) => {
      heard = Array.from(event.results, (result) => result[0].transcript).join(" ").trim();
      setTranscript(heard);
    };
    instance.onerror = (event) => {
      if (event.error === "aborted") return;
      failed = true;
      setError(ERRORS[event.error] ?? "unknown");
      setStatus("error");
    };
    instance.onend = () => {
      if (recognition.current !== instance) return;
      recognition.current = null;
      setIsSpeaking(false);
      if (failed) return;
      if (!heard) {
        setError("no-speech");
        setStatus("error");
        return;
      }
      setStatus("done");
    };

    setError(null);
    setStatus("starting");
    try {
      instance.start();
    } catch {
      setError("unknown");
      setStatus("error");
    }
  }, [locale]);

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
