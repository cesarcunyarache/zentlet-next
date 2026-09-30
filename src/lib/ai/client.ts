import { generateText, Output } from "ai";
import { ZodTypeAny } from "zod";

import { logger } from "@/lib/observability/logger";
import { reportError } from "@/lib/observability/server";
import { AI_MODEL } from "./models";

/**
 * Con Gemini degradado la llamada no debe retener la petición: tiempo
 * total acotado (incluido el reintento) y un solo reintento.
 */
const TIMEOUT_MS = 10_000;
const MAX_RETRIES = 1;

interface GenerateObjectImage {
  data: Uint8Array;
  mediaType: string;
}

interface GenerateObjectParams<T extends ZodTypeAny> {
  /** Nombre estable de la operación en logs y trazas (p. ej. `category.generate`). */
  operation: string;
  prompt: string;
  schema: T;
  /** Imagen que acompaña al prompt (p. ej. una boleta). Nunca se registra. */
  image?: GenerateObjectImage;
  timeoutMs?: number;
}

function buildInput(prompt: string, image?: GenerateObjectImage) {
  if (!image) return { prompt };
  return {
    messages: [
      {
        role: "user" as const,
        content: [
          { type: "text" as const, text: prompt },
          { type: "file" as const, data: image.data, mediaType: image.mediaType },
        ],
      },
    ],
  };
}

/**
 * Único punto de salida hacia el modelo: aquí se mide latencia, tokens y
 * fallos. El prompt lleva texto del usuario sobre sus gastos, así que ni
 * los logs ni las trazas registran entradas ni salidas.
 */
export async function generateObject<T extends ZodTypeAny>({
  operation,
  prompt,
  schema,
  image,
  timeoutMs = TIMEOUT_MS,
}: GenerateObjectParams<T>) {
  const startedAt = performance.now();
  const durationMs = () => Math.round(performance.now() - startedAt);

  try {
    const { output, usage } = await generateText({
      model: AI_MODEL,
      ...buildInput(prompt, image),
      timeout: timeoutMs,
      maxRetries: MAX_RETRIES,
      output: Output.object({
        schema,
      }),
      telemetry: { functionId: operation, recordInputs: false, recordOutputs: false },
    });

    logger.info(
      {
        operation,
        model: AI_MODEL.modelId,
        durationMs: durationMs(),
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
      },
      "ai.generate",
    );
    return output;
  } catch (error) {
    reportError(error, "ai.generate_failed", { operation, model: AI_MODEL.modelId, durationMs: durationMs() });
    throw error;
  }
}
