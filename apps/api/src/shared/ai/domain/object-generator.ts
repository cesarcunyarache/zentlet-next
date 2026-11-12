import type { ZodTypeAny, z } from 'zod';

export type GenerateObjectFile = {
  data: Uint8Array;
  mediaType: string;
};

export type GenerateObjectRequest<T extends ZodTypeAny> = {
  /** Stable operation name for logs/traces (e.g. `category.generate`). */
  operation: string;
  prompt: string;
  schema: T;
  /** A file accompanying the prompt (a receipt photo, a voice note). Never logged. */
  file?: GenerateObjectFile;
  timeoutMs: number;
};

export type GenerateObjectResult<T extends ZodTypeAny> = {
  output: z.infer<T>;
  inputTokens?: number;
  outputTokens?: number;
};

export abstract class ObjectGenerator {
  abstract readonly model: string;
  abstract generate<T extends ZodTypeAny>(request: GenerateObjectRequest<T>): Promise<GenerateObjectResult<T>>;
}
