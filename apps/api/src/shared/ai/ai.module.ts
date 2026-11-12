import { Global, Module } from '@nestjs/common';
import { AiService } from './application/ai.service.js';
import { ObjectGenerator } from './domain/object-generator.js';
import { GoogleObjectGenerator } from './infrastructure/google-object-generator.js';

const PROVIDERS: Record<string, () => ObjectGenerator | null> = {
  google: () =>
    process.env.GOOGLE_GENERATIVE_AI_API_KEY
      ? new GoogleObjectGenerator(process.env.GOOGLE_GENERATIVE_AI_API_KEY)
      : null,
};

@Global()
@Module({
  providers: [
    {
      provide: ObjectGenerator,
      useFactory: () => PROVIDERS[process.env.AI_PROVIDER || 'google']?.() ?? null,
    },
    AiService,
  ],
  exports: [AiService],
})
export class AiModule {}
