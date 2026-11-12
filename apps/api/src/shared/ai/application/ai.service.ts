import { Inject, Injectable } from '@nestjs/common';
import type { ZodTypeAny, z } from 'zod';
import { Logger } from '../../logger/domain/logger.js';
import { ObjectGenerator, type GenerateObjectRequest } from '../domain/object-generator.js';

const DEFAULT_TIMEOUT_MS = 10_000;

type GenerateObjectParams<T extends ZodTypeAny> = Omit<GenerateObjectRequest<T>, 'timeoutMs'> & { timeoutMs?: number };

@Injectable()
export class AiService {
  constructor(
    @Inject(ObjectGenerator) private readonly generator: ObjectGenerator | null,
    private readonly logger: Logger,
  ) {}

  isConfigured(): boolean {
    return this.generator !== null;
  }

  async generateObject<T extends ZodTypeAny>({
    timeoutMs = DEFAULT_TIMEOUT_MS,
    ...request
  }: GenerateObjectParams<T>): Promise<z.infer<T>> {
    const startedAt = performance.now();
    const durationMs = () => Math.round(performance.now() - startedAt);
    const ai = this.generator;

    try {
      if (!ai) throw new Error('AI provider is not configured');
      const { output, inputTokens, outputTokens } = await ai.generate({ ...request, timeoutMs });
      this.logger.info(
        { operation: request.operation, model: ai.model, durationMs: durationMs(), inputTokens, outputTokens },
        'ai.generate',
      );
      return output;
    } catch (error) {
      this.logger.error(
        { err: error, operation: request.operation, model: ai?.model, durationMs: durationMs() },
        'ai.generate_failed',
      );
      throw error;
    }
  }
}
