import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { ObjectGenerator } from "../types";
import { aiSdkGenerate } from "./ai-sdk";

/** Adaptador de Gemini (Google) sobre el AI SDK. */

const MODEL = "gemini-2.5-flash-lite";
const CHECK_TIMEOUT_MS = 5_000;

export function createGoogleGenerator(apiKey: string): ObjectGenerator {
  return {
    model: MODEL,
    generate: aiSdkGenerate(createGoogleGenerativeAI({ apiKey })(MODEL)),
    async check() {
      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1", {
        headers: { "x-goog-api-key": apiKey },
        cache: "no-store",
        signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
      });
      if (response.ok) return { status: "ok", detail: "Clave válida" };
      return { status: "error", detail: response.status < 500 ? "Clave inválida" : `Google respondió ${response.status}` };
    },
  };
}
