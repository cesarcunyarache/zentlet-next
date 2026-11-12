import { Global, Module } from '@nestjs/common';
import { PinoLogger } from './adapters/pino-logger.js';
import { Logger } from './types.js';

@Global()
@Module({
  providers: [{ provide: Logger, useClass: PinoLogger }],
  exports: [Logger],
})
export class LoggerModule {}
