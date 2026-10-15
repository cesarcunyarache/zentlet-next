import { generateText, Output, type LanguageModel } from "ai";
import type { z, ZodTypeAny } from "zod";
import type { GenerateObjectFile, GenerateObjectRequest, ObjectGenerator } from "../types";

/*
 * Llamada común a cualquier modelo del AI SDK. Con el proveedor degradado
 * la llamada no debe retener la petición: tiempo total acotado (incluido el
 * reintento) y un solo reintento. Ni las trazas registran entradas ni salidas.
 */

const MAX_RETRIES = 1;

function buildInput(prompt: string, file?: GenerateObjectFile) {
  if (!file) return { prompt };
  return {
    messages: [
      {
        role: "user" as const,
        content: [
          { type: "text" as const, text: prompt },
          { type: "file" as const, data: file.data, mediaType: file.mediaType },
        ],
      },
    ],
  };
}

export function aiSdkGenerate(model: LanguageModel): ObjectGenerator["generate"] {
  return async <T extends ZodTypeAny>({ operation, prompt, schema, file, timeoutMs }: GenerateObjectRequest<T>) => {
    const { output, usage } = await generateText({
      model,
      ...buildInput(prompt, file),
      timeout: timeoutMs,
      maxRetries: MAX_RETRIES,
      output: Output.object({ schema }),
      telemetry: { functionId: operation, recordInputs: false, recordOutputs: false },
    });
    return { output: output as z.infer<T>, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens };
  };
}
