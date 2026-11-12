import { Global, Module } from '@nestjs/common';
import { Logger } from '../logger/domain/logger.js';
import { InProcessBackgroundRunner } from './infrastructure/in-process-background-runner.js';
import { BackgroundRunner } from './domain/background-runner.js';

@Global()
@Module({
  providers: [
    {
      provide: BackgroundRunner,
      useFactory: (logger: Logger) => new InProcessBackgroundRunner(logger),
      inject: [Logger],
    },
  ],
  exports: [BackgroundRunner],
})
export class BackgroundModule {}
