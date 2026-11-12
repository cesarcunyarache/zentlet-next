import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText, Output, type LanguageModel } from 'ai';
import type { ZodTypeAny, z } from 'zod';
import {
  ObjectGenerator,
  type GenerateObjectFile,
  type GenerateObjectRequest,
  type GenerateObjectResult,
} from '../domain/object-generator.js';

const MODEL = 'gemini-2.5-flash-lite';
const MAX_RETRIES = 1;

function buildInput(prompt: string, file?: GenerateObjectFile) {
  if (!file) return { prompt };
  return {
    messages: [
      {
        role: 'user' as const,
        content: [
          { type: 'text' as const, text: prompt },
          { type: 'file' as const, data: file.data, mediaType: file.mediaType },
        ],
      },
    ],
  };
}

export class GoogleObjectGenerator extends ObjectGenerator {
  readonly model = MODEL;
  private readonly languageModel: LanguageModel;

  constructor(apiKey: string) {
    super();
    this.languageModel = createGoogleGenerativeAI({ apiKey })(MODEL);
  }

  async generate<T extends ZodTypeAny>(request: GenerateObjectRequest<T>): Promise<GenerateObjectResult<T>> {
    const { operation, prompt, schema, file, timeoutMs } = request;
    const { output, usage } = await generateText({
      model: this.languageModel,
      ...buildInput(prompt, file),
      timeout: timeoutMs,
      maxRetries: MAX_RETRIES,
      output: Output.object({ schema }),
      telemetry: { functionId: operation, recordInputs: false, recordOutputs: false },
    });
    return { output: output as z.infer<T>, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens };
  }
}
