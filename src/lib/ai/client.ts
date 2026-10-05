import type { ZodTypeAny } from "zod";
import type { CheckOutcome } from "@/lib/health/types";
import { logger } from "@/lib/observability/logger";
import { reportError } from "@/lib/observability/server";
import { createGoogleGenerator } from "./adapters/google";
import type { GenerateObjectRequest, ObjectGenerator } from "./types";

/*
 * Único punto de salida hacia el modelo: aquí se mide latencia, tokens y
 * fallos. El proveedor se elige con `AI_PROVIDER` (por defecto `google`);
 * añadir otro es escribir su adaptador y registrarlo en `PROVIDERS`. El
 * prompt lleva texto del usuario sobre sus gastos: ni los logs ni las
 * trazas registran entradas ni salidas.
 */

const TIMEOUT_MS = 10_000;

const PROVIDERS: Record<string, () => ObjectGenerator | null> = {
  google: () =>
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ? createGoogleGenerator(process.env.GOOGLE_GENERATIVE_AI_API_KEY) : null,
};

const providerName = () => process.env.AI_PROVIDER || "google";

let generator: ObjectGenerator | null | undefined;

function getGenerator() {
  if (generator === undefined) generator = PROVIDERS[providerName()]?.() ?? null;
  return generator;
}

type GenerateObjectParams<T extends ZodTypeAny> = Omit<GenerateObjectRequest<T>, "timeoutMs"> & { timeoutMs?: number };

export async function generateObject<T extends ZodTypeAny>({ timeoutMs = TIMEOUT_MS, ...request }: GenerateObjectParams<T>) {
  const startedAt = performance.now();
  const durationMs = () => Math.round(performance.now() - startedAt);
  const ai = getGenerator();

  try {
    if (!ai) throw new Error(`AI provider "${providerName()}" is not configured`);
    const { output, inputTokens, outputTokens } = await ai.generate({ ...request, timeoutMs });
    logger.info(
      { operation: request.operation, model: ai.model, durationMs: durationMs(), inputTokens, outputTokens },
      "ai.generate",
    );
    return output;
  } catch (error) {
    reportError(error, "ai.generate_failed", { operation: request.operation, model: ai?.model, durationMs: durationMs() });
    throw error;
  }
}

export async function checkAi(): Promise<CheckOutcome> {
  if (!PROVIDERS[providerName()]) return { status: "error", detail: `Proveedor desconocido: ${providerName()}` };
  const ai = getGenerator();
  if (!ai) return { status: "off", detail: "Sin configurar · IA desactivada" };
  return ai.check();
}
