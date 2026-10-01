import { generateText, Output, type LanguageModel } from "ai";
import type { z, ZodTypeAny } from "zod";
import type { GenerateObjectImage, GenerateObjectRequest, ObjectGenerator } from "../types";

/*
 * Llamada común a cualquier modelo del AI SDK. Con el proveedor degradado
 * la llamada no debe retener la petición: tiempo total acotado (incluido el
 * reintento) y un solo reintento. Ni las trazas registran entradas ni salidas.
 */

const MAX_RETRIES = 1;

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

export function aiSdkGenerate(model: LanguageModel): ObjectGenerator["generate"] {
  return async <T extends ZodTypeAny>({ operation, prompt, schema, image, timeoutMs }: GenerateObjectRequest<T>) => {
    const { output, usage } = await generateText({
      model,
      ...buildInput(prompt, image),
      timeout: timeoutMs,
      maxRetries: MAX_RETRIES,
      output: Output.object({ schema }),
      telemetry: { functionId: operation, recordInputs: false, recordOutputs: false },
    });
    return { output: output as z.infer<T>, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens };
  };
}
