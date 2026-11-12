import { Global, Module } from '@nestjs/common';
import { Logger } from '../logger/types.js';
import { InProcessBackgroundRunner } from './adapters/in-process-background-runner.js';
import { BackgroundRunner } from './types.js';

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
