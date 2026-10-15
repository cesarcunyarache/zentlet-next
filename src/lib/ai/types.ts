import type { z, ZodTypeAny } from "zod";
import type { CheckOutcome } from "@/lib/health/types";

export interface GenerateObjectFile {
  data: Uint8Array;
  mediaType: string;
}

export interface GenerateObjectRequest<T extends ZodTypeAny> {
  /** Nombre estable de la operación en logs y trazas (p. ej. `category.generate`). */
  operation: string;
  prompt: string;
  schema: T;
  /** Archivo que acompaña al prompt (la foto de una boleta, una nota de voz). Nunca se registra. */
  file?: GenerateObjectFile;
  timeoutMs: number;
}

export interface GenerateObjectResult<T extends ZodTypeAny> {
  output: z.infer<T>;
  inputTokens?: number;
  outputTokens?: number;
}

/**
 * Modelo que devuelve un objeto validado con un esquema. El resto del
 * código sólo conoce `generateObject` (en `client.ts`); cada proveedor es
 * un adaptador que además sabe comprobar su clave.
 */
export interface ObjectGenerator {
  readonly model: string;
  generate<T extends ZodTypeAny>(request: GenerateObjectRequest<T>): Promise<GenerateObjectResult<T>>;
  check(): Promise<CheckOutcome>;
}
